import { Module } from '@nestjs/common';
import { FocService } from './foc.service';
import { FocController } from './foc.controller';
import { PdfService } from '../common/services/pdf.service';

@Module({
  providers: [FocService, PdfService],
  controllers: [FocController],
  exports: [FocService],
})
export class FocModule {}
