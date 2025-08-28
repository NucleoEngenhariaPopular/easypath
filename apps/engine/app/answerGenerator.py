
from Flow import Flow
from LLM import getLLMAnswer
from Chat import ChatHistory
import logging

# TODO adicionar variáveis aos textos do prompt, ie: trocar {{nome_var}} por valor_var no texto

def promptFormatting(flow: Flow, current_node_id: str) -> tuple[str, float]:
    node = next((node for node in flow.nodes if node.id == current_node_id))
    
    global_prompt = 'Objetivo Geral da conversa: {flow.global_objective}\
                    \nTom/Abordagem da conversa: {flow.global_tone}\
                    \nLinguajar da conversa: {flow.global_language}\
                    \nComportamento do agente virtual: {flow.global_behaviour}\
                    \nValores Globais: {flow.global_values}'
    
    node_prompt =  '\nContexto da mensagem atual: {node.prompt.context}\
                    \nObjetivo da mensagem atual: {node.prompt.objective}\
                    \nObservações da mensagem atual: {node.prompt.notes}\
                    \nExemplos da mensagem atual: {node.prompt.examples}'
    
    prompt =   f'{global_prompt}\
                \n-------------------------------\n\
                \n{node_prompt}'

    return prompt, node.temperature



def generate(flow: Flow, chat_history: ChatHistory, current_node_id:str) -> str:
    logging.info(f'Generating Response for message: {chat_history.getLastMessage()}')
    
    prompt, temperature = promptFormatting(flow, current_node_id=current_node_id)
    
    llmAnswer = getLLMAnswer(messages= chat_history.getLLMformatted() + 
                                       [{"content": prompt, "role": "system"}],
                             temperature=temperature)
    
    if llmAnswer["success"]:
        return str(llmAnswer["response"])
    return "" #TODO create error handling

