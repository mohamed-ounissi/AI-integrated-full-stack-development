import { Controller, Get, NotFoundException, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const ticket = await this.ticketsService.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  @Post(':id/summary')
  summary(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.summarize(id);
  }
}
