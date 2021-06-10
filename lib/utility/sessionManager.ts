import { Option, some, none } from "ts-option";
import { ClientSession, startSession } from 'mongoose';
import { hasTransaction } from "../config/config";


export const startSessionAndTransaction = (): Promise<Option<ClientSession>> =>{

    return hasTransaction() ? startSession().then((session) => {
           session.startTransaction();
           return some(session); 
        }
    ) : Promise.resolve<Option<ClientSession>>(none);

        
}