export interface TechSelection {
  tech: string;
  subTechs: string[];
}

export interface Entry {
  id: string;
  date: string;
  dayNumber: number;
  project: string;
  categories: string[];
  title: string;
  description: string;
  technologies: TechSelection[];
  teamType: 'solo' | 'team';
  teamSize?: number;
  codingLanguages?: string[];
  createdAt: string;
}

export interface SchemaTech {
  name: string;
  group: string;
  subTechs: string[];
}

export interface ProjectInfo {
  title: string;
  description: string;
  techStack: string[];
  teamType: 'solo' | 'team';
  teamSize?: number;
}

export interface Schema {
  projects: string[];
  categories: string[];
  technologies: SchemaTech[];
  projectInfos?: Record<string, ProjectInfo>;
}

export interface Preferences {
  lastProject: string;
  lastCategories: string[];
  lastTechnologies: TechSelection[];
  lastTeamType: 'solo' | 'team';
  lastTaskCount: number;
  lastCodingLanguages?: string[];
  lastTeamSize?: number;
}

export interface TaskFormState {
  id: string;
  categories: string[];
  title: string;
  description: string;
  technologies: TechSelection[];
  teamType: 'solo' | 'team';
  teamSize?: number;
  codingLanguages?: string[];
}

export type PageName = 'log' | 'analyst' | 'logs' | 'settings';
