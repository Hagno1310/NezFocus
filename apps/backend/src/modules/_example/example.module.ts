import { Module } from '@nestjs/common';
import { ExampleController } from './example.controller.js';
import { ExampleRepository } from './example.repository.js';
import { ExampleService } from './example.service.js';

// Reference module: copy this folder to start a feature. Not imported by AppModule.
@Module({
  controllers: [ExampleController],
  providers: [ExampleService, ExampleRepository],
})
export class ExampleModule {}
