export interface Cycle {
  id: number;
  name: string;
  legislation_id: number;
  created_at: Date;
}

export interface CreateCycleDTO {
  name: string;
  legislation_id: number;
}

export interface UpdateCycleDTO {
  name?: string;
  legislation_id?: number;
}

export interface CycleWithLegislation extends Cycle {
  legislation_name: string;
}
