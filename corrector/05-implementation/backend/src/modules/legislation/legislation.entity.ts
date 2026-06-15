export interface Legislation {
  id: number;
  name: string;
  start_year: number;
  created_at: Date;
}

export interface CreateLegislationDTO {
  name: string;
  start_year: number;
}

export interface UpdateLegislationDTO {
  name?: string;
  start_year?: number;
}
