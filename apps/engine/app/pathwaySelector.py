
from Flow import Flow, Connection
from Chat import ChatHistory
from LLM import getLLMAnswer
import logging
from fuzzywuzzy import process, fuzz

# TODO o que acontece se a IA acha que nenhum dos caminhos é valido?

FUZZY_THRESHOLD = 80

def promptFormatting(flow: Flow, current_node_id: str) -> tuple[str,list[Connection]]:
    
    connections_list: list[Connection] = []
    connections_list_string: str = ""
    connection_counter:int  = 1
    
    for connection in flow.connections:
        if connection.source == current_node_id:
            connections_list_string += f"\n{connection_counter}) - Nome: {connection.label}\
                                        \nDescrição: {connection.description}"
            connections_list.append(connection)
            connection_counter+=1
            
    prompt =    f'Você deve escolher o melhor caminho a ser tomado nesse fluxo de conversa\
                \nPara isso, analise o histórico da conversa, especialmente a última mensagem, e as opções de caminho a serem tomadas a seguir\
                \nAo escolher o melhor caminho, retorne apenas o nome desse caminho para sinalizar sua escolha. Não retorne nenhum texto além do nome do caminho.\
                \n\nOpções de caminho:{connections_list_string}'

    return prompt,connections_list



def choose(flow: Flow, chat_history: ChatHistory, current_node_id:str) -> str:
    logging.info(f'Generating Response for message: {chat_history.getLastMessage()}')
    
    prompt, connection_list = promptFormatting(flow, current_node_id=current_node_id)
    
    
    llmAnswer: dict = getLLMAnswer(messages= chat_history.getLLMformatted() +
                                   [{"content": prompt, "role": "system"}])
    
    if llmAnswer["success"]:
        
        best_match, score = process.extractOne(str(llmAnswer["response"]),                               # type: ignore
                                               [connection.label for connection in connection_list], 
                                               scorer=fuzz.ratio)

        if score >= FUZZY_THRESHOLD:  
            for connection in connection_list:
                if connection.label == best_match:
                    return connection.target
        
        # TODO o que acontece quando o nome do caminho não é encontrado?        

            
    return "" #TODO create error handling

