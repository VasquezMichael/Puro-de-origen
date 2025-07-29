// global.d.ts
import { Mongoose } from 'mongoose';

// Extiende la interfaz global de NodeJS para añadir la propiedad 'mongoose'
declare global {
  namespace NodeJS {
    interface Global {
      mongoose: {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      };
    }
  }
}

// Esto es necesario para que TypeScript reconozca el archivo como un módulo global
export {};
