import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.mongoUri'),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectionFactory: (connection: any) => {
          connection.on('connected', () =>
            console.log('✅ Mongoose connected to MongoDB'),
          );
          connection.on('error', (err: Error) =>
            console.error('❌ MongoDB connection error:', err),
          );
          connection.on('disconnected', () =>
            console.warn('⚠️ MongoDB disconnected'),
          );
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MongooseConfigModule {}
