import logging
from time import perf_counter
from typing import Tuple, Dict, Any
from ..models.flow import Flow
from ..models.session import ChatSession
from ..llm.providers import get_llm
from .variable_extractor import format_variables_for_prompt


def _format_prompts(flow: Flow, current_node_id: str, session: ChatSession) -> tuple[str, float]:
    node = next((node for node in flow.nodes if node.id == current_node_id))

    global_prompt = (
        f"Objetivo Geral da conversa: {flow.global_objective}\n"
        f"Tom/Abordagem da conversa: {flow.global_tone}\n"
        f"Linguajar da conversa: {flow.global_language}\n"
        f"Comportamento do agente virtual: {flow.global_behaviour}\n"
        f"Valores Globais: {flow.global_values}"
    )

    node_prompt = (
        f"\nContexto da mensagem atual: {node.prompt.context}\n"
        f"Objetivo da mensagem atual: {node.prompt.objective}\n"
        f"Observações da mensagem atual: {node.prompt.notes}\n"
        f"Exemplos da mensagem atual: {node.prompt.examples}"
    )

    # Add custom prompt fields if present
    if node.prompt.custom_fields:
        custom_fields_str = "\n".join([
            f"{field_name}: {field_value}"
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
    
    start_time = perf_counter()
    llm_answer = llm.chat(
        messages=session.to_llm_messages() + [{"content": prompt, "role": "system"}],
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


