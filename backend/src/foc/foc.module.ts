import { Module } from '@nestjs/common';
import { FocService } from './foc.service';
import { FocController } from './foc.controller';

@Module({
  providers: [FocService],
  controllers: [FocController],
  exports: [FocService],
})
export class FocModule {}
