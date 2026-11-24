import { Injectable, signal } from '@angular/core';

const CHAVE = 'pitoco_som_ativo';

/**
 * Sons de aviso do temporizador, gerados pelo próprio navegador (Web Audio):
 * não precisa de arquivo de áudio. O usuário pode silenciar (preferência salva).
 */
@Injectable({ providedIn: 'root' })
export class SomService {
  readonly ativo = signal(SomService.lerPreferencia());

  private ctx: AudioContext | null = null;

  /**
   * O navegador só libera áudio depois de um clique. Chame isto dentro do clique em
   * "Iniciar": assim os avisos que tocam sozinhos mais tarde (fim do foco/da pausa) funcionam.
   */
  desbloquear(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // sem suporte a áudio: o app segue funcionando em silêncio
    }
  }

  alternar(): void {
    const novo = !this.ativo();
    this.ativo.set(novo);
    try {
      localStorage.setItem(CHAVE, novo ? '1' : '0');
    } catch {
      /* ignorar */
    }
    if (novo) {
      this.desbloquear();
      this.notas([660], 0.18); // toquinho de confirmação
    }
  }

  /** Começou a pausa: duas notas descendo (relaxa). */
  tocarInicioPausa(): void {
    this.notas([784, 587, 523], 0.28);
  }

  /** Começou um novo foco: três notas subindo (vamos lá!). */
  tocarInicioFoco(): void {
    this.notas([523, 659, 784, 1046], 0.2);
  }

  private notas(frequencias: number[], duracao: number): void {
    if (!this.ativo() || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    frequencias.forEach((freq, i) => {
      const inicio = ctx.currentTime + i * duracao;
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // sobe rápido e some devagar, para soar como um "plim" e não como um bipe seco
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao * 1.6);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + duracao * 1.7);
    });
  }

  private static lerPreferencia(): boolean {
    try {
      return localStorage.getItem(CHAVE) !== '0';
    } catch {
      return true;
    }
  }
}
