import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PdfService } from '../common/services/pdf.service';

@Module({
  providers: [PortfolioService, PdfService],
  controllers: [PortfolioController],
  exports: [PortfolioService],
})
export class PortfolioModule {}
