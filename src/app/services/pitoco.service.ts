import { Injectable, inject, signal } from '@angular/core';
import { StorageService, Mascote, ConfigTimer, SessaoFoco } from './storage.service';
import { CATALOGO_LOJA, ItemLoja, ehCosmetico } from './loja.catalogo';

const DIA_MS = 24 * 60 * 60 * 1000;
const BONUS_FELICIDADE_POR_CICLO = 10;

export interface ResultadoCompra {
  sucesso: boolean;
  mensagem: string;
}

const limitar = (valor: number, min = 0, max = 100) => Math.min(max, Math.max(min, valor));

/**
 * Regras de negócio do PITOCO (RN001, RN002, RN004, RN006).
 *
 * Fica por cima do StorageService: ele só guarda/lê no localStorage,
 * este serviço decide o que acontece (ganhar moedas, comprar, decair...).
 * Os valores expostos são signals, então as telas atualizam sozinhas.
 */
@Injectable({ providedIn: 'root' })
export class PitocoService {
  private readonly storage = inject(StorageService);

  readonly catalogo = CATALOGO_LOJA;

  private readonly _saldo = signal(this.storage.getSaldo());
  private readonly _mascote = signal<Mascote>(this.storage.getMascote());
  private readonly _itensComprados = signal<string[]>(this.storage.getItensComprados());
  private readonly _config = signal<ConfigTimer>(this.storage.getConfig());

  /** true enquanto um ciclo de FOCO está rodando: o menu fica bloqueado (UC7 / RN002). */
  private readonly _focoAtivo = signal(false);

  readonly saldo = this._saldo.asReadonly();
  readonly mascote = this._mascote.asReadonly();
  readonly itensComprados = this._itensComprados.asReadonly();
  readonly config = this._config.asReadonly();
  readonly focoAtivo = this._focoAtivo.asReadonly();

  constructor() {
    this.aplicarDecaimento();
  }

  // ---------------------------------------------------------------- foco

  setFocoAtivo(ativo: boolean): void {
    this._focoAtivo.set(ativo);
  }

  salvarConfig(config: ConfigTimer): void {
    this.storage.setConfig(config);
    this._config.set(config);
  }

  /**
   * Ciclo de foco concluído: 1 pitocoin por minuto (RN001).
   * Devolve quantas moedas foram ganhas.
   */
  concluirFoco(segundosFocados: number, inicio: number): number {
    const ganho = Math.floor(segundosFocados / 60);

    this.atualizarSaldo(this._saldo() + ganho);
    this.registrarSessao({ inicio, segundosFoco: segundosFocados, concluida: true, pitocoins: ganho });

    // Focar anima o Pitoco e zera o relógio de inatividade (RN004).
    const m = this._mascote();
    this.salvarMascote({
      ...m,
      felicidade: limitar(m.felicidade + BONUS_FELICIDADE_POR_CICLO),
      ultimaAtualizacao: Date.now(),
    });

    return ganho;
  }

  /** Botão de emergência ou saída da tela durante o foco: sessão fica registrada, sem moedas (RN002). */
  cancelarFoco(inicio: number, segundosDecorridos: number): void {
    if (segundosDecorridos <= 0) return;
    this.registrarSessao({ inicio, segundosFoco: segundosDecorridos, concluida: false, pitocoins: 0 });
  }

  // ------------------------------------------------------------- mascote

  alterarNome(novoNome: string): boolean {
    const nome = novoNome.trim();
    if (!nome) return false;
    this.salvarMascote({ ...this._mascote(), nome });
    return true;
  }

  possui(itemId: string): boolean {
    return this._itensComprados().includes(itemId);
  }

  estaEquipado(itemId: string): boolean {
    return this._mascote().itensEquipados.includes(itemId);
  }

  /** Veste ou tira uma roupa/sapato já comprado. Só um item por categoria. */
  alternarEquipado(item: ItemLoja): void {
    if (!ehCosmetico(item.categoria) || !this.possui(item.id)) return;

    const m = this._mascote();
    const outrasCategorias = m.itensEquipados.filter(
      (id) => this.catalogo.find((i) => i.id === id)?.categoria !== item.categoria,
    );
    const jaEquipado = m.itensEquipados.includes(item.id);

    this.salvarMascote({
      ...m,
      itensEquipados: jaEquipado ? outrasCategorias : [...outrasCategorias, item.id],
    });
  }

  // ---------------------------------------------------------------- loja

  comprarItem(item: ItemLoja): ResultadoCompra {
    const cosmetico = ehCosmetico(item.categoria);

    // RN006: item cosmético não pode ser comprado duas vezes (comida e bebida podem).
    if (cosmetico && this.possui(item.id)) {
      return { sucesso: false, mensagem: 'Você já possui este item no guarda-roupa!' };
    }

    // RN006: precisa ter saldo.
    if (this._saldo() < item.preco) {
      return { sucesso: false, mensagem: 'Pitocoins insuficientes! Faça mais sessões de foco.' };
    }

    this.atualizarSaldo(this._saldo() - item.preco);

    if (cosmetico) {
      const ids = [...this._itensComprados(), item.id];
      this.storage.setItensComprados(ids);
      this._itensComprados.set(ids);
      this.alternarEquipado(item); // já sai vestindo
    } else {
      // RN004: comida e bebida restauram saúde e felicidade.
      const m = this._mascote();
      this.salvarMascote({
        ...m,
        saude: limitar(m.saude + (item.efeitoSaude ?? 0)),
        felicidade: limitar(m.felicidade + (item.efeitoFelicidade ?? 0)),
      });
    }

    return { sucesso: true, mensagem: `${item.nome} comprado com sucesso!` };
  }

  // ------------------------------------------------------------- privados

  /**
   * RN004: a cada 24 h sem concluir foco, o mascote perde saúde e felicidade.
   * Avança o relógio só pelos dias já cobrados, para não "perdoar" o resto das horas.
   */
  private aplicarDecaimento(): void {
    const m = this._mascote();
    const dias = Math.floor((Date.now() - m.ultimaAtualizacao) / DIA_MS);
    if (dias < 1) return;

    this.salvarMascote({
      ...m,
      saude: limitar(m.saude - dias * 10, 10),
      felicidade: limitar(m.felicidade - dias * 15, 10),
      ultimaAtualizacao: m.ultimaAtualizacao + dias * DIA_MS,
    });
  }

  private atualizarSaldo(valor: number): void {
    this.storage.setSaldo(valor);
    this._saldo.set(this.storage.getSaldo());
  }

  private salvarMascote(m: Mascote): void {
    this.storage.setMascote(m);
    this._mascote.set(m);
  }

  private registrarSessao(s: SessaoFoco): void {
    this.storage.adicionarSessao(s);
  }
}
