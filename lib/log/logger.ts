
class Logger{

    log(message: string){

    
        console.log(`${new Date().toISOString()} INFO ${message}`);

    }

    error(message: string){

        console.error(`${new Date().toISOString()} ERROR ${message}`);

    }

    warn(message: string){
        
        console.warn(`${new Date().toISOString()} WARNING ${message}`);

    }

}


export const logger = new Logger();