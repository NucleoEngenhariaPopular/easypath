import logging
import re
from time import perf_counter
from typing import Tuple, Dict, Any
from ..models.flow import Flow
from ..models.session import ChatSession
from ..llm.providers import get_llm
from .variable_extractor import format_variables_for_prompt


def _substitute_variables(text: str, session: ChatSession) -> str:
    """
    Replace {{variable_name}} with actual values from session.
    
    Args:
        text: Text containing variable references
        session: Current chat session with extracted variables
        
    Returns:
        Text with variables replaced by their actual values
    """
    if not text:
        return text
    
    pattern = r'\{\{(\w+)\}\}'
    
    def replacer(match):
        var_name = match.group(1)
        value = session.extracted_variables.get(var_name)
        if value is not None:
            return str(value)
        # Keep the original placeholder if variable not found
        return match.group(0)
    
    return re.sub(pattern, replacer, text)


def _format_prompts(flow: Flow, current_node_id: str, session: ChatSession) -> tuple[str, float]:
    node = next((node for node in flow.nodes if node.id == current_node_id))

    # Apply variable substitution to all text fields
    global_objective = _substitute_variables(flow.global_objective, session)
    global_tone = _substitute_variables(flow.global_tone, session)
    global_language = _substitute_variables(flow.global_language, session)
    global_behaviour = _substitute_variables(flow.global_behaviour, session)
    global_values = _substitute_variables(flow.global_values, session)

    node_context = _substitute_variables(node.prompt.context, session)
    node_objective = _substitute_variables(node.prompt.objective, session)
    node_notes = _substitute_variables(node.prompt.notes, session)
    node_examples = _substitute_variables(node.prompt.examples, session)

    global_prompt = (
        f"Objetivo Geral da conversa: {global_objective}\n"
        f"Tom/Abordagem da conversa: {global_tone}\n"
        f"Linguajar da conversa: {global_language}\n"
        f"Comportamento do agente virtual: {global_behaviour}\n"
        f"Valores Globais: {global_values}"
    )

    node_prompt = (
        f"\n**INSTRUÇÕES CRÍTICAS - OBEDEÇA RIGOROSAMENTE:**\n\n"
        f"🎯 OBJETIVO OBRIGATÓRIO DA SUA PRÓXIMA RESPOSTA:\n"
        f"'{node_objective}'\n\n"
        f"📋 Contexto: {node_context}\n"
        f"📝 Observações: {node_notes}\n"
        f"💡 Exemplos de como responder: {node_examples}\n\n"
        f"⚠️ REGRAS ABSOLUTAS:\n"
        f"1. Sua resposta deve seguir EXATAMENTE o objetivo acima\n"
        f"2. NÃO invente perguntas ou tópicos diferentes\n"
        f"3. NÃO siga padrões implícitos da conversa anterior\n"
        f"4. NÃO crie conteúdo fora do objetivo especificado\n"
        f"5. Se o objetivo diz 'Perguntar X', pergunte EXATAMENTE X\n"
        f"\nQualquer desvio do objetivo acima é estritamente PROIBIDO."
    )

    # Add custom prompt fields if present (with variable substitution)
    if node.prompt.custom_fields:
        custom_fields_str = "\n".join([
            f"{field_name}: {_substitute_variables(field_value, session)}"
            for field_name, field_value in node.prompt.custom_fields.items()
        ])
        node_prompt += f"\n{custom_fields_str}"

    # Add extracted variables context
    variables_context = format_variables_for_prompt(session)

    prompt = f"{global_prompt}\n-------------------------------\n{node_prompt}{variables_context}"
    return prompt, node.temperature


def generate_response(flow: Flow, session: ChatSession, current_node_id: str) -> Tuple[str, Dict[str, Any]]:
    prompt, temperature = _format_prompts(flow, current_node_id, session)
    llm = get_llm()

    # Get the current node to extract objective for reinforcement
    node = next((node for node in flow.nodes if node.id == current_node_id))

    # Apply variable substitution to reinforcement prompt
    node_objective_substituted = _substitute_variables(node.prompt.objective, session)

    # Create a reinforcement message to place AFTER conversation history
    # This ensures the LLM sees the objective immediately before generating
    reinforcement_prompt = (
        f"ATENÇÃO: Sua próxima resposta deve seguir EXATAMENTE este objetivo:\n"
        f"'{node_objective_substituted}'\n\n"
        f"NÃO invente perguntas diferentes. NÃO siga padrões da conversa anterior. "
        f"Responda SOMENTE conforme o objetivo acima."
    )

    start_time = perf_counter()
    # Sandwich approach: System prompt at START + Reinforcement at END
    llm_answer = llm.chat(
        messages=[
            {"content": prompt, "role": "system"}
        ] + session.to_llm_messages() + [
            {"content": reinforcement_prompt, "role": "system"}
        ],
        temperature=temperature,
    )
    llm_time_ms = llm_answer.timing_ms or ((perf_counter() - start_time) * 1000)
    
    llm_info = {
        "timing_ms": round(llm_time_ms, 1),
        "model_name": llm_answer.model_name or "unknown",
        "input_tokens": llm_answer.input_tokens or 0,
        "output_tokens": llm_answer.output_tokens or 0,
        "total_tokens": llm_answer.total_tokens or 0,
        "estimated_cost_usd": llm_answer.estimated_cost_usd or 0.0
    }
    if llm_answer.success and isinstance(llm_answer.response, str):
        return llm_answer.response, llm_info
    # Loga falhas/ausências de resposta para facilitar diagnóstico
    logging.warning(
        "LLM response failure: success=%s, error=%s, llm_time=%.1fms tokens=%d/%d cost=$%.6f model=%s",
        llm_answer.success,
        getattr(llm_answer, "error_message", None),
        llm_info["timing_ms"],
        llm_info["input_tokens"],
        llm_info["output_tokens"],
        llm_info["estimated_cost_usd"],
        llm_info["model_name"],
    )
    return "", llm_info


