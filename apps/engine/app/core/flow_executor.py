import logging
from time import perf_counter
from typing import Tuple
from ..models.flow import Flow
from ..models.session import ChatSession
from ..llm.providers import get_llm


def _format_prompts(flow: Flow, current_node_id: str) -> tuple[str, float]:
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

    prompt = f"{global_prompt}\n-------------------------------\n{node_prompt}"
    return prompt, node.temperature


def generate_response(flow: Flow, session: ChatSession, current_node_id: str) -> Tuple[str, float]:
    prompt, temperature = _format_prompts(flow, current_node_id)
    llm = get_llm()
    
    start_time = perf_counter()
    llm_answer = llm.chat(
        messages=session.to_llm_messages() + [{"content": prompt, "role": "system"}],
        temperature=temperature,
    )
    llm_time_ms = llm_answer.timing_ms or ((perf_counter() - start_time) * 1000)
    if llm_answer.success and isinstance(llm_answer.response, str):
        return llm_answer.response, llm_time_ms
    # Loga falhas/ausências de resposta para facilitar diagnóstico
    logging.warning(
        "LLM response failure: success=%s, error=%s, llm_time=%.1fms",
        llm_answer.success,
        getattr(llm_answer, "error_message", None),
        llm_time_ms,
    )
    return "", llm_time_ms


