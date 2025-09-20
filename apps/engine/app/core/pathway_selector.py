import logging
from ..models.flow import Flow, Connection
from ..models.session import ChatSession
from ..llm.providers import get_llm
from fuzzywuzzy import process, fuzz

FUZZY_THRESHOLD = 80


def _format_prompt(flow: Flow, current_node_id: str) -> tuple[str, list[Connection]]:
    connections_list: list[Connection] = []
    connections_list_string = ""
    connection_counter = 1

    for connection in flow.connections:
        if connection.source == current_node_id:
            connections_list_string += (
                f"\n{connection_counter}) - Nome: {connection.label}\nDescrição: {connection.description}"
            )
            connections_list.append(connection)
            connection_counter += 1

    prompt = (
        "Você deve escolher o melhor caminho a ser tomado nesse fluxo de conversa\n"
        "Para isso, analise o histórico da conversa, especialmente a última mensagem, e as opções de caminho a serem tomadas a seguir\n"
        "Ao escolher o melhor caminho, retorne apenas o nome desse caminho para sinalizar sua escolha. Não retorne nenhum texto além do nome do caminho.\n\n"
        f"Opções de caminho:{connections_list_string}"
    )

    return prompt, connections_list


def choose_next(flow: Flow, session: ChatSession, current_node_id: str) -> str:
    prompt, connection_list = _format_prompt(flow, current_node_id)
    llm = get_llm()
    llm_answer = llm.chat(messages=session.to_llm_messages() + [{"content": prompt, "role": "system"}])

    if llm_answer.success and isinstance(llm_answer.response, str):
        labels = [connection.label for connection in connection_list]
        if not labels:
            logging.warning("Pathway selection: sem conexoes saindo de %s", current_node_id)
            return current_node_id

        result = process.extractOne(
            llm_answer.response,
            labels,
            scorer=fuzz.ratio,
        )

        if not result:
            logging.warning(
                "Pathway selection: extractOne retornou None para resposta='%s'",
                llm_answer.response,
            )
            return current_node_id

        best_match = result[0]
        score = result[1] if len(result) > 1 else 0

        if score >= FUZZY_THRESHOLD:
            for connection in connection_list:
                if connection.label == best_match:
                    return connection.target
        logging.warning(
            "Pathway selection: baixa confianca (score=%s < %s) para resposta='%s'",
            score,
            FUZZY_THRESHOLD,
            llm_answer.response,
        )
    else:
        logging.warning(
            "Pathway selection: LLM falhou ou sem resposta. success=%s, error=%s",
            llm_answer.success,
            getattr(llm_answer, "error_message", None),
        )

    return current_node_id


