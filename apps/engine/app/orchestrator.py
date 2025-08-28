

import logging # TODO add logging to this file
from Flow import Flow
from answerGenerator import generate
from pathwaySelector import choose
from Chat import ChatHistory, Message



def getFlow() -> Flow:
    flow = Flow()
    flow.loadFromFile()
    return flow

def run():
    flow = getFlow()
    chat_history = ChatHistory()
    current_node = flow.getNodeByID(flow.first_node_id)
    
    
    while not current_node.is_end:
        
        last_message = input()        
        chat_history.addUserMessage(last_message)
        
        current_node = flow.getNodeByID(choose(flow,chat_history,current_node.id))
        
        assistant_reply = generate(flow, chat_history, current_node.id)
        print(assistant_reply)

    
    