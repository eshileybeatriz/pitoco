import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonMenuButton } from '@ionic/angular';

import { PitocoStorageService, SessaoFoco, dataLocal } from '../services/pitoco-storage.service';

interface DiaGrafico {
  rotulo: string;
  minutos: number;
  altura: number; // % da altura do gráfico
  hoje: boolean;
}

export type Periodo = 'diario' | 'semanal' | 'mensal';

const PERIODOS: Record<Periodo, { rotulo: string; dias: number }> = {
  diario: { rotulo: 'Hoje', dias: 1 },
  semanal: { rotulo: 'Últimos 7 dias', dias: 7 },
  mensal: { rotulo: 'Últimos 30 dias', dias: 30 },
};

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

@Component({
  selector: 'app-estatisticas',
  templateUrl: 'estatisticas.page.html',
  styleUrls: ['estatisticas.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonMenuButton],
})
export class EstatisticasPage {
  readonly storage = inject(PitocoStorageService);

  private readonly porData = computed(
    () => new Map<string, SessaoFoco>(this.storage.dados().historicoFoco.map((h) => [h.data, h] as [string, SessaoFoco])),
  );

  readonly temDados = computed(() => this.storage.dados().historicoFoco.some((h) => h.minutos > 0));

  /** Período escolhido pelo usuário (UC4, fluxo alternativo). O padrão é a visão geral por período. */
  readonly periodo = signal<Periodo>('semanal');
  readonly periodos: { id: Periodo; rotulo: string }[] = [
    { id: 'diario', rotulo: 'Diário' },
    { id: 'semanal', rotulo: 'Semanal' },
    { id: 'mensal', rotulo: 'Mensal' },
  ];

  readonly rotuloPeriodo = computed(() => PERIODOS[this.periodo()].rotulo);

  /** Registros filtrados pelo período selecionado. */
  private readonly registrosDoPeriodo = computed<SessaoFoco[]>(() => {
    const mapa = this.porData();
    const agora = new Date();
    const lista: SessaoFoco[] = [];
    for (let i = 0; i < PERIODOS[this.periodo()].dias; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
      const reg = mapa.get(dataLocal(d));
      if (reg) lista.push(reg);
    }
    return lista;
  });

  /** Números do período selecionado. */
  readonly totais = computed(() => {
    const regs = this.registrosDoPeriodo();
    return {
      minutos: regs.reduce((soma, h) => soma + h.minutos, 0),
      ciclos: regs.reduce((soma, h) => soma + h.ciclos, 0),
      pitocoins: regs.reduce((soma, h) => soma + h.pitocoinsGanhos, 0),
      cancelados: regs.reduce((soma, h) => soma + h.cancelados, 0),
    };
  });


  /** Quantos dias o gráfico mostra: 30 no mensal, 7 nos demais. */
  readonly diasGrafico = computed(() => (this.periodo() === 'mensal' ? 30 : 7));

  /** Barras de minutos por dia (do mais antigo para hoje). */
  readonly grafico = computed<DiaGrafico[]>(() => {
    const mapa = this.porData();
    const total = this.diasGrafico();
    const agora = new Date();
    const dias = [];
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
      dias.push({
        rotulo: total > 7 ? String(d.getDate()) : DIAS_SEMANA[d.getDay()],
        minutos: mapa.get(dataLocal(d))?.minutos ?? 0,
        hoje: i === 0,
      });
    }
    const maximo = Math.max(...dias.map((d) => d.minutos), 1);
    return dias.map((d) => ({ ...d, altura: (d.minutos / maximo) * 100 }));
  });

  selecionarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
  }

  formatarMinutos(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  }
}
