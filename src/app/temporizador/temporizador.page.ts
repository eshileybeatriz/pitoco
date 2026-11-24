import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { IonContent, IonMenuButton } from '@ionic/angular';

import {
  CICLOS_ATE_PAUSA_LONGA,
  PAUSA_LONGA_MIN,
  PitocoStorageService,
} from '../services/pitoco-storage.service';
import { SomService } from '../services/som.service';
import { PitocoAvatarComponent } from '../shared/pitoco-avatar/pitoco-avatar.component';

type Modo = 'FOCO' | 'PAUSA';

interface Aviso {
  titulo: string;
  texto: string;
}

@Component({
  selector: 'app-temporizador',
  templateUrl: 'temporizador.page.html',
  styleUrls: ['temporizador.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton, PitocoAvatarComponent],
})
export class TemporizadorPage implements OnDestroy {
  readonly storage = inject(PitocoStorageService);
  readonly som = inject(SomService);

  // Configuração (RN003): padrão 25 min de foco e 5 min de pausa
  readonly focoMin = signal(25);
  readonly pausaMin = signal(5);

  readonly modo = signal<Modo>('FOCO');
  readonly segundosRestantes = signal(25 * 60);
  readonly totalFaseSeg = signal(25 * 60);
  readonly emExecucao = signal(false);
  readonly ciclosConcluidos = signal(0);

  readonly emergenciaAcionada = signal(false);
  readonly confirmandoSos = signal(false);
  readonly aviso = signal<Aviso | null>(null);

  // Tempo personalizado (UC3, fluxo alternativo): limites aceitos
  readonly limiteFoco = { min: 1, max: 120 };
  readonly limitePausa = { min: 1, max: 30 };
  readonly focoPersonalizado = signal('');
  readonly pausaPersonalizada = signal('');
  readonly erroPersonalizado = signal<string | null>(null);

  /** Momento (timestamp) em que a fase termina. Usar a hora real evita atrasos quando a aba fica em segundo plano. */
  private fimPrevisto: number | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  readonly tempoFormatado = computed(() => {
    const total = this.segundosRestantes();
    const min = Math.floor(total / 60);
    const seg = total % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  });

  readonly progresso = computed(() => {
    const total = this.totalFaseSeg();
    return total > 0 ? Math.min(100, (1 - this.segundosRestantes() / total) * 100) : 0;
  });

  readonly titulo = computed(() => {
    if (this.modo() === 'PAUSA') return 'Pausa: beba uma água!';
    return this.emExecucao() ? 'Foco total!' : 'Pronto para focar?';
  });

  readonly rotuloIniciar = computed(() => {
    if (this.modo() === 'FOCO') return 'Iniciar foco';
    return this.segundosRestantes() < this.totalFaseSeg() ? 'Continuar pausa' : 'Iniciar pausa';
  });

  readonly podeReiniciar = computed(
    () =>
      !this.emExecucao() &&
      (this.modo() === 'PAUSA' || this.segundosRestantes() !== this.focoMin() * 60 || this.ciclosConcluidos() > 0),
  );

  // ---------- Configuração ----------

  selecionarTempo(foco: number, pausa: number): void {
    if (this.emExecucao()) return; // não muda a configuração durante o ciclo
    this.pararRelogio();
    this.focoMin.set(foco);
    this.pausaMin.set(pausa);
    this.modo.set('FOCO');
    this.totalFaseSeg.set(foco * 60);
    this.segundosRestantes.set(foco * 60);
    this.emergenciaAcionada.set(false);
    this.confirmandoSos.set(false);
  }

  aoDigitarPersonalizado(campo: 'foco' | 'pausa', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    (campo === 'foco' ? this.focoPersonalizado : this.pausaPersonalizada).set(valor);
    this.erroPersonalizado.set(null);
  }

  /** O usuário define os próprios tempos de foco e pausa antes de iniciar o ciclo. */
  aplicarPersonalizado(): void {
    if (this.emExecucao()) return;
    const foco = Number(this.focoPersonalizado());
    const pausa = Number(this.pausaPersonalizada());
    const { min: fMin, max: fMax } = this.limiteFoco;
    const { min: pMin, max: pMax } = this.limitePausa;

    if (!Number.isInteger(foco) || foco < fMin || foco > fMax) {
      this.erroPersonalizado.set(`O foco deve ser um número inteiro entre ${fMin} e ${fMax} minutos.`);
      return;
    }
    if (!Number.isInteger(pausa) || pausa < pMin || pausa > pMax) {
      this.erroPersonalizado.set(`A pausa deve ser um número inteiro entre ${pMin} e ${pMax} minutos.`);
      return;
    }
    this.erroPersonalizado.set(null);
    this.selecionarTempo(foco, pausa);
    this.aviso.set({ titulo: 'Tempo personalizado!', texto: `Foco de ${foco} min e pausa de ${pausa} min.` });
  }

  // ---------- Controles ----------

  /** Play: inicia a fase atual e, daí em diante, foco e pausas se encadeiam sozinhos. */
  iniciar(): void {
    if (this.emExecucao()) return;
    this.som.desbloquear(); // precisa acontecer dentro do clique para os avisos futuros tocarem
    this.emergenciaAcionada.set(false);
    this.confirmandoSos.set(false);
    this.aviso.set(null);
    this.rodarFase();
  }

  /** Liga o relógio da fase atual (usado pelo play e pela troca automática de fase). */
  private rodarFase(): void {
    this.emExecucao.set(true);

    // Durante o FOCO o menu e a navegação ficam bloqueados (UC7 / RN002); na pausa ficam livres
    this.storage.setModoFoco(this.modo() === 'FOCO');

    this.fimPrevisto = Date.now() + this.segundosRestantes() * 1000;
    this.intervalo = setInterval(() => this.tick(), 500);
  }

  /** Só é possível pausar a PAUSA. O foco só termina concluindo ou pelo botão de emergência. */
  pausar(): void {
    if (this.modo() !== 'PAUSA') return;
    this.pararRelogio();
    this.emExecucao.set(false);
  }

  /** Volta ao começo: foco com o tempo cheio e contador de ciclos zerado. */
  reiniciar(): void {
    if (this.emExecucao()) return;
    this.pararRelogio();
    this.modo.set('FOCO');
    this.totalFaseSeg.set(this.focoMin() * 60);
    this.segundosRestantes.set(this.focoMin() * 60);
    this.ciclosConcluidos.set(0);
    this.emergenciaAcionada.set(false);
    this.confirmandoSos.set(false);
    this.aviso.set(null);
  }

  /** BOTÃO DE EMERGÊNCIA (SOS) - RN002: cancela o ciclo, não ganha Pitocoins e libera a navegação. */
  confirmarEmergencia(): void {
    this.pararRelogio();
    this.emExecucao.set(false);
    this.confirmandoSos.set(false);
    this.emergenciaAcionada.set(true);
    this.storage.setModoFoco(false);
    this.storage.registrarCicloCancelado();

    this.totalFaseSeg.set(this.focoMin() * 60);
    this.segundosRestantes.set(this.focoMin() * 60);
  }

  // ---------- Relógio ----------

  private tick(): void {
    if (this.fimPrevisto === null) return;
    const restante = Math.max(0, Math.ceil((this.fimPrevisto - Date.now()) / 1000));
    this.segundosRestantes.set(restante);
    if (restante === 0) this.concluirFase();
  }

  private pararRelogio(): void {
    if (this.intervalo !== null) clearInterval(this.intervalo);
    this.intervalo = null;
    this.fimPrevisto = null;
  }

  /** Fim de uma fase: credita o foco (se for o caso) e já começa a próxima, com um aviso sonoro. */
  private concluirFase(): void {
    this.pararRelogio();

    if (this.modo() === 'FOCO') {
      this.ciclosConcluidos.update((c) => c + 1);

      // RN001: 1 Pitocoin por minuto focado
      const ganho = this.storage.registrarCicloConcluido(this.focoMin());

      // UC3: a cada 4 ciclos, pausa longa de 15 min
      const pausaLonga = this.ciclosConcluidos() % CICLOS_ATE_PAUSA_LONGA === 0;
      const minutosPausa = pausaLonga ? PAUSA_LONGA_MIN : this.pausaMin();

      this.modo.set('PAUSA');
      this.totalFaseSeg.set(minutosPausa * 60);
      this.segundosRestantes.set(minutosPausa * 60);
      this.aviso.set({
        titulo: 'Ciclo concluído! 🎉',
        texto: `Você ganhou +${ganho} Pitocoins. A ${pausaLonga ? 'pausa longa' : 'pausa'} de ${minutosPausa} min já começou.`,
      });
      this.som.tocarInicioPausa();
    } else {
      this.modo.set('FOCO');
      this.totalFaseSeg.set(this.focoMin() * 60);
      this.segundosRestantes.set(this.focoMin() * 60);
      this.aviso.set({ titulo: 'Fim da pausa!', texto: `Um novo foco de ${this.focoMin()} min já começou.` });
      this.som.tocarInicioFoco();
    }

    this.rodarFase(); // segue automaticamente, sem precisar apertar play de novo
  }

  /** Avisa o navegador antes de fechar/recarregar a aba no meio de um foco. */
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeSair(evento: BeforeUnloadEvent): void {
    if (this.storage.isModoFoco()) evento.preventDefault();
  }

  ngOnDestroy(): void {
    this.pararRelogio();
    this.storage.setModoFoco(false);
  }
}
