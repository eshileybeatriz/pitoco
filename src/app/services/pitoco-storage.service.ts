import { Injectable, computed, signal } from '@angular/core';

/**
 * Serviço ÚNICO de dados do PITOCO (localStorage).
 *
 * Junta o StorageService da interface com o PitocoStorageService do
 * temporizador/mascote/loja. Todas as páginas leem e gravam por aqui.
 *
 * O estado é exposto como signals (`dados`, `mascote`, `pitocoins`,
 * `focoAtivo`): quando algo muda, as telas se atualizam sozinhas, inclusive
 * dentro de setInterval (funciona com ou sem zone.js).
 */

export type CategoriaItem = 'camiseta' | 'sapato' | 'comida' | 'bebida';

export interface ItemLoja {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  preco: number;
  icone: string;
  visual?: string; // identifica qual imagem do mascote usar (camiseta/sapato)
  efeitoSaude?: number;
  efeitoFelicidade?: number;
}

export interface SessaoFoco {
  data: string; // YYYY-MM-DD (data LOCAL)
  minutos: number;
  pitocoinsGanhos: number;
  ciclos: number; // ciclos de foco concluídos no dia
  cancelados: number; // ciclos cancelados pelo botão de emergência
}

export interface Mascote {
  nome: string;
  saude: number; // 0 a 100
  felicidade: number; // 0 a 100
  ultimoAcesso: string; // ISO, base do decaimento (RN004)
  camisetaEquipada: string | null;
  sapatoEquipado: string | null;
}

export interface DadosPitoco {
  usuarioNome: string; // vazio = primeiro acesso
  tutorialConcluido: boolean;
  pitocoins: number;
  mascote: Mascote;
  inventario: string[]; // ids de roupas/sapatos já comprados (RN006)
  historicoFoco: SessaoFoco[];
}

export interface ResultadoCompra {
  sucesso: boolean;
  mensagem: string;
}

const STORAGE_KEY = 'pitoco_app_data_v1';
const DIA_MS = 24 * 60 * 60 * 1000;

export const CICLOS_ATE_PAUSA_LONGA = 4; // UC3
export const PAUSA_LONGA_MIN = 15; // UC3

/** Data local no formato YYYY-MM-DD (toISOString usaria UTC e erraria à noite no Brasil). */
export function dataLocal(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function limitar(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

function dadosIniciais(): DadosPitoco {
  return {
    usuarioNome: '',
    tutorialConcluido: false,
    pitocoins: 14, // começa com 14, como no protótipo
    mascote: {
      nome: 'Pitoco',
      saude: 85,
      felicidade: 90,
      ultimoAcesso: new Date().toISOString(),
      camisetaEquipada: null,
      sapatoEquipado: null,
    },
    inventario: [],
    historicoFoco: [],
  };
}

/** Lê do localStorage; se estiver vazio ou corrompido, devolve os dados iniciais. */
function carregar(): DadosPitoco {
  const padrao = dadosIniciais();
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return padrao;
    const salvo = JSON.parse(bruto) as Partial<DadosPitoco>;
    return {
      ...padrao,
      ...salvo,
      mascote: { ...padrao.mascote, ...(salvo.mascote ?? {}) },
      inventario: Array.isArray(salvo.inventario) ? salvo.inventario : [],
      historicoFoco: Array.isArray(salvo.historicoFoco)
        ? salvo.historicoFoco.map((h) => ({ ...h, ciclos: h.ciclos ?? 0, cancelados: h.cancelados ?? 0 }))
        : [],
    };
  } catch {
    return padrao;
  }
}

@Injectable({ providedIn: 'root' })
export class PitocoStorageService {
  /** Catálogo fixo da loja (UC6). */
  readonly catalogoLoja: ItemLoja[] = [
    { id: 'regata_verde', nome: 'Regata Verde', categoria: 'camiseta', preco: 15, icone: '👕', visual: 'regata' },
    { id: 'camisa_listrada', nome: 'Camiseta Listrada', categoria: 'camiseta', preco: 20, icone: '🎽', visual: 'listrada' },
    { id: 'tenis', nome: 'Tênis Esportivo', categoria: 'sapato', preco: 25, icone: '👟', visual: 'tenis' },
    { id: 'prato_saudavel', nome: 'Refeição Completa', categoria: 'comida', preco: 10, icone: '🥗', efeitoSaude: 20, efeitoFelicidade: 15 },
    { id: 'suco_natural', nome: 'Suco Refrescante', categoria: 'bebida', preco: 5, icone: '🧃', efeitoSaude: 10, efeitoFelicidade: 10 },
  ];

  private readonly _dados = signal<DadosPitoco>(carregar());
  private readonly _focoAtivo = signal(false);

  readonly dados = this._dados.asReadonly();
  readonly mascote = computed(() => this._dados().mascote);
  readonly pitocoins = computed(() => this._dados().pitocoins);

  /** true enquanto um ciclo de FOCO está rodando: a navegação fica bloqueada (UC7 / RN002). */
  readonly focoAtivo = this._focoAtivo.asReadonly();

  constructor() {
    this.removerItensInexistentes();
    this.aplicarDecaimento();
    this.salvar(this._dados());
  }

  /** Dados salvos por versões antigas podem ter ids de itens que não existem mais no catálogo. */
  private removerItensInexistentes(): void {
    const existe = (id: string | null) => !!id && this.catalogoLoja.some((i) => i.id === id);
    const d = this._dados();
    const m = d.mascote;
    if (
      d.inventario.every(existe) &&
      (!m.camisetaEquipada || existe(m.camisetaEquipada)) &&
      (!m.sapatoEquipado || existe(m.sapatoEquipado))
    ) {
      return;
    }
    this._dados.set({
      ...d,
      inventario: d.inventario.filter(existe),
      mascote: {
        ...m,
        camisetaEquipada: existe(m.camisetaEquipada) ? m.camisetaEquipada : null,
        sapatoEquipado: existe(m.sapatoEquipado) ? m.sapatoEquipado : null,
      },
    });
  }

  // ---------- Persistência ----------

  private salvar(dados: DadosPitoco): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch {
      // armazenamento cheio ou bloqueado: o app segue funcionando sem salvar
    }
  }

  private atualizar(fn: (d: DadosPitoco) => DadosPitoco): void {
    const novo = fn(this._dados());
    this._dados.set(novo);
    this.salvar(novo);
  }

  /** Apaga tudo e volta ao estado inicial (usado na demonstração). */
  reiniciarDados(): void {
    this._focoAtivo.set(false);
    const inicial = dadosIniciais();
    this._dados.set(inicial);
    this.salvar(inicial);
  }

  // ---------- Perfil ----------

  definirUsuario(nome: string): void {
    const limpo = nome.trim().slice(0, 20);
    if (limpo) this.atualizar((d) => ({ ...d, usuarioNome: limpo }));
  }

  concluirTutorial(): void {
    this.atualizar((d) => ({ ...d, tutorialConcluido: true }));
  }

  // ---------- Modo foco (bloqueio de navegação) ----------

  setModoFoco(ativo: boolean): void {
    this._focoAtivo.set(ativo);
  }

  isModoFoco(): boolean {
    return this._focoAtivo();
  }

  // ---------- Recompensas e sessões (RN001 / RN002) ----------

  /** Ciclo de foco concluído: 1 Pitocoin por minuto (RN001). Devolve as moedas ganhas. */
  registrarCicloConcluido(minutosFocados: number): number {
    const moedas = Math.floor(minutosFocados);
    this.atualizar((d) => ({
      ...d,
      pitocoins: d.pitocoins + moedas,
      mascote: {
        ...d.mascote,
        felicidade: limitar(d.mascote.felicidade + 10),
        ultimoAcesso: new Date().toISOString(),
      },
      historicoFoco: this.atualizarDia(d.historicoFoco, (h) => ({
        ...h,
        minutos: h.minutos + minutosFocados,
        pitocoinsGanhos: h.pitocoinsGanhos + moedas,
        ciclos: h.ciclos + 1,
      })),
    }));
    return moedas;
  }

  /** Ciclo cancelado pelo botão de emergência: não ganha nada (RN002). */
  registrarCicloCancelado(): void {
    this.atualizar((d) => ({
      ...d,
      historicoFoco: this.atualizarDia(d.historicoFoco, (h) => ({ ...h, cancelados: h.cancelados + 1 })),
    }));
  }

  private atualizarDia(historico: SessaoFoco[], fn: (h: SessaoFoco) => SessaoFoco): SessaoFoco[] {
    const hoje = dataLocal();
    if (historico.some((h) => h.data === hoje)) {
      return historico.map((h) => (h.data === hoje ? fn(h) : h));
    }
    const novo: SessaoFoco = { data: hoje, minutos: 0, pitocoinsGanhos: 0, ciclos: 0, cancelados: 0 };
    return [...historico, fn(novo)];
  }

  // ---------- Mascote e loja (RN004 / RN006) ----------

  itemPorId(id: string): ItemLoja | undefined {
    return this.catalogoLoja.find((i) => i.id === id);
  }

  alterarNomeMascote(novoNome: string): void {
    const nome = novoNome.trim().slice(0, 20);
    if (nome) this.atualizar((d) => ({ ...d, mascote: { ...d.mascote, nome } }));
  }

  comprarItem(itemId: string): ResultadoCompra {
    const item = this.itemPorId(itemId);
    if (!item) return { sucesso: false, mensagem: 'Item não encontrado.' };

    const dados = this._dados();
    const cosmetico = item.categoria === 'camiseta' || item.categoria === 'sapato';

    // RN006: não pode comprar roupa/sapato repetido
    if (cosmetico && dados.inventario.includes(item.id)) {
      return { sucesso: false, mensagem: 'Você já possui este item no guarda-roupa!' };
    }
    // RN006: precisa ter saldo
    if (dados.pitocoins < item.preco) {
      return { sucesso: false, mensagem: 'Pitocoins insuficientes! Faça mais sessões de foco.' };
    }

    this.atualizar((d) => {
      const base = { ...d, pitocoins: d.pitocoins - item.preco };
      if (cosmetico) {
        // roupa/sapato: vai para o guarda-roupa e já sai equipado
        return {
          ...base,
          inventario: [...d.inventario, item.id],
          mascote: {
            ...d.mascote,
            camisetaEquipada: item.categoria === 'camiseta' ? item.id : d.mascote.camisetaEquipada,
            sapatoEquipado: item.categoria === 'sapato' ? item.id : d.mascote.sapatoEquipado,
          },
        };
      }
      // comida/bebida: restaura saúde e felicidade (RN004)
      return {
        ...base,
        mascote: {
          ...d.mascote,
          saude: limitar(d.mascote.saude + (item.efeitoSaude ?? 0)),
          felicidade: limitar(d.mascote.felicidade + (item.efeitoFelicidade ?? 0)),
        },
      };
    });

    return { sucesso: true, mensagem: `${item.nome} comprado com sucesso!` };
  }

  /** Equipa o item; se já estiver equipado, remove. Só funciona para itens comprados. */
  equiparItem(itemId: string): void {
    const item = this.itemPorId(itemId);
    if (!item || !this._dados().inventario.includes(item.id)) return;

    this.atualizar((d) => {
      const m = d.mascote;
      if (item.categoria === 'camiseta') {
        return { ...d, mascote: { ...m, camisetaEquipada: m.camisetaEquipada === item.id ? null : item.id } };
      }
      if (item.categoria === 'sapato') {
        return { ...d, mascote: { ...m, sapatoEquipado: m.sapatoEquipado === item.id ? null : item.id } };
      }
      return d;
    });
  }

  /**
   * Decaimento por inatividade (RN004): a cada 24 h sem foco, -10 de saúde e
   * -15 de felicidade (mínimo 10). O "resto" de horas é preservado.
   */
  private aplicarDecaimento(): void {
    const mascote = this._dados().mascote;
    const ultimo = new Date(mascote.ultimoAcesso).getTime();

    if (Number.isNaN(ultimo)) {
      this.atualizar((d) => ({ ...d, mascote: { ...d.mascote, ultimoAcesso: new Date().toISOString() } }));
      return;
    }

    const dias = Math.floor((Date.now() - ultimo) / DIA_MS);
    if (dias < 1) return;

    this.atualizar((d) => ({
      ...d,
      mascote: {
        ...d.mascote,
        saude: Math.max(10, d.mascote.saude - dias * 10),
        felicidade: Math.max(10, d.mascote.felicidade - dias * 15),
        ultimoAcesso: new Date(ultimo + dias * DIA_MS).toISOString(),
      },
    }));
  }
}
