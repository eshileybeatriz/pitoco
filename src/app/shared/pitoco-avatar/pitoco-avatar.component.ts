import { Component, computed, inject, input } from '@angular/core';
import { PitocoStorageService } from '../../services/pitoco-storage.service';

/**
 * Mascote (ouriço) em imagem. Reage ao estado salvo: troca a imagem conforme a
 * camiseta e o tênis equipados, e fica um pouco "apagado" quando saúde/felicidade estão baixas.
 *
 * As imagens ficam em assets/mascote/:
 *   base.png            sem roupa
 *   tenis.png           só tênis
 *   regata.png          regata verde
 *   regata-tenis.png    regata verde + tênis
 *   listrada.png        camiseta listrada            (PROVISÓRIA: ainda é a versão com tênis)
 *   listrada-tenis.png  camiseta listrada + tênis
 *
 * Uso: <app-pitoco-avatar [tamanho]="160" [animado]="true" />
 */
@Component({
  selector: 'app-pitoco-avatar',
  standalone: true,
  template: `
    <img
      [src]="imagem()"
      [alt]="'Mascote ' + mascote().nome"
      [style.width.px]="tamanho()"
      [class.flutuar]="animado()"
      [class.cansado]="humor() === 'triste'"
      [class.normal]="humor() === 'normal'"
      draggable="false"
    />
  `,
  styles: [
    `
      :host {
        display: inline-block;
        line-height: 0;
      }
      img {
        display: block;
        height: auto;
        max-width: 100%;
        user-select: none;
        transition: filter 0.4s;
      }
      img.normal {
        filter: saturate(0.85);
      }
      img.cansado {
        filter: saturate(0.5) brightness(0.96);
      }
      .flutuar {
        animation: flutuar 2.6s ease-in-out infinite;
      }
      @keyframes flutuar {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-6px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .flutuar {
          animation: none;
        }
      }
    `,
  ],
})
export class PitocoAvatarComponent {
  readonly tamanho = input(160);
  readonly animado = input(false);

  private readonly storage = inject(PitocoStorageService);
  readonly mascote = this.storage.mascote;

  /** Humor geral: média de saúde e felicidade. */
  readonly humor = computed<'feliz' | 'normal' | 'triste'>(() => {
    const m = this.mascote();
    const media = (m.saude + m.felicidade) / 2;
    if (media >= 70) return 'feliz';
    if (media >= 40) return 'normal';
    return 'triste';
  });

  readonly imagem = computed(() => {
    const m = this.mascote();
    const camisa = this.visualDoItem(m.camisetaEquipada);
    const sapato = this.visualDoItem(m.sapatoEquipado);

    let nome = 'base';
    if (camisa && sapato) nome = `${camisa}-tenis`;
    else if (camisa) nome = camisa;
    else if (sapato) nome = 'tenis';

    return `assets/mascote/${nome}.png`;
  });

  private visualDoItem(id: string | null): string | null {
    if (!id) return null;
    return this.storage.itemPorId(id)?.visual ?? null;
  }
}
