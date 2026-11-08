import { Injectable } from '@angular/core';

/**
 * Camada única de acesso ao localStorage.
 * Todos os módulos (temporizador, mascote, loja, estatísticas) devem ler e
 * gravar dados por aqui, para não haver chaves duplicadas ou conflitantes.
 */

export interface ConfigTimer {
  focoMin: number;
  pausaMin: number;
  pausaLongaMin: number;
  ciclosAtePausaLonga: number;
}

export interface Mascote {
  nome: string;
  felicidade: number; // 0 a 100
  saude: number; // 0 a 100
  ultimaAtualizacao: number; // timestamp (ms), usado para o decaimento (RN004)
  itensEquipados: string[]; // ids de itens da loja
}

export interface SessaoFoco {
  inicio: number; // timestamp (ms)
  segundosFoco: number;
  concluida: boolean; // false quando cancelada pelo botão de emergência
  pitocoins: number; // 0 quando cancelada (RN002)
}

export interface Perfil {
  nome: string;
  tutorialConcluido: boolean;
}

const PREFIXO = 'pitoco:';

export const CHAVES = {
  perfil: 'perfil',
  config: 'config',
  mascote: 'mascote',
  saldo: 'saldo',
  sessoes: 'sessoes',
  itensComprados: 'itensComprados',
} as const;

export const CONFIG_PADRAO: ConfigTimer = {
  focoMin: 25,
  pausaMin: 5,
  pausaLongaMin: 15,
  ciclosAtePausaLonga: 4,
};

export const MASCOTE_PADRAO: Mascote = {
  nome: 'Pitoco',
  felicidade: 100,
  saude: 100,
  ultimaAtualizacao: Date.now(),
  itensEquipados: [],
};

@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Lê e converte um valor. Devolve o padrão se não existir ou estiver corrompido. */
  get<T>(chave: string, padrao: T): T {
    try {
      const bruto = localStorage.getItem(PREFIXO + chave);
      return bruto === null ? padrao : (JSON.parse(bruto) as T);
    } catch {
      return padrao;
    }
  }

  set<T>(chave: string, valor: T): void {
    try {
      localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    } catch {
      // armazenamento cheio ou bloqueado: o app continua funcionando sem salvar
    }
  }

  remover(chave: string): void {
    try {
      localStorage.removeItem(PREFIXO + chave);
    } catch {
      /* ignorar */
    }
  }

  /** Apaga todos os dados do PITOCO (útil para testes e para a demonstração). */
  limparTudo(): void {
    Object.values(CHAVES).forEach((c) => this.remover(c));
  }

  // ---- Atalhos tipados ----

  getPerfil(): Perfil {
    return this.get<Perfil>(CHAVES.perfil, { nome: '', tutorialConcluido: false });
  }
  setPerfil(p: Perfil): void {
    this.set(CHAVES.perfil, p);
  }

  getConfig(): ConfigTimer {
    return this.get<ConfigTimer>(CHAVES.config, { ...CONFIG_PADRAO });
  }
  setConfig(c: ConfigTimer): void {
    this.set(CHAVES.config, c);
  }

  getMascote(): Mascote {
    return this.get<Mascote>(CHAVES.mascote, { ...MASCOTE_PADRAO, ultimaAtualizacao: Date.now() });
  }
  setMascote(m: Mascote): void {
    this.set(CHAVES.mascote, m);
  }

  getSaldo(): number {
    return this.get<number>(CHAVES.saldo, 0);
  }
  setSaldo(valor: number): void {
    this.set(CHAVES.saldo, Math.max(0, Math.floor(valor)));
  }

  getSessoes(): SessaoFoco[] {
    return this.get<SessaoFoco[]>(CHAVES.sessoes, []);
  }
  adicionarSessao(s: SessaoFoco): void {
    this.set(CHAVES.sessoes, [...this.getSessoes(), s]);
  }

  getItensComprados(): string[] {
    return this.get<string[]>(CHAVES.itensComprados, []);
  }
  setItensComprados(ids: string[]): void {
    this.set(CHAVES.itensComprados, ids);
  }
}
