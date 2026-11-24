import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonMenuButton } from '@ionic/angular';

import { CICLOS_ATE_PAUSA_LONGA, PAUSA_LONGA_MIN, PitocoStorageService } from '../services/pitoco-storage.service';

interface Passo {
  titulo: string;
  texto: string;
}

@Component({
  selector: 'app-tutorial',
  templateUrl: 'tutorial.page.html',
  styleUrls: ['tutorial.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton],
})
export class TutorialPage {
  readonly storage = inject(PitocoStorageService);
  private readonly router = inject(Router);

  readonly passos: Passo[] = [
    {
      titulo: 'A Técnica Pomodoro',
      texto: `Você alterna ciclos de foco (por padrão, 25 minutos) com pausas curtas (5 minutos). A cada ${CICLOS_ATE_PAUSA_LONGA} ciclos, vem uma pausa longa de ${PAUSA_LONGA_MIN} minutos. Pequenos passos, grandes conquistas!`,
    },
    {
      titulo: 'Temporizador',
      texto: 'Escolha o tempo de foco e de pausa (ou digite o seu próprio tempo) e toque em Iniciar. Na pausa você pode pausar e continuar; se quiser recomeçar, use Reiniciar.',
    },
    {
      titulo: 'Modo foco',
      texto: 'Enquanto o foco estiver rodando, o menu fica bloqueado para você não se distrair. Só dá para sair concluindo o ciclo ou usando o botão de emergência.',
    },
    {
      titulo: 'Pitocoins',
      texto: 'Cada minuto de foco concluído vale 1 Pitocoin. Se você usar o botão de emergência, o ciclo é cancelado e nenhuma moeda é ganha.',
    },
    {
      titulo: 'Cuide do seu Pitoco',
      texto: 'Focar deixa o Pitoco mais feliz. Depois de 24 horas sem focar, ele perde saúde e felicidade. Em Meu Pitoco você acompanha como ele está e pode mudar o nome dele.',
    },
    {
      titulo: 'Loja',
      texto: 'Gaste suas Pitocoins em camisetas e tênis (cada um só pode ser comprado uma vez) ou em comida e bebida, que recuperam saúde e felicidade.',
    },
    {
      titulo: 'Estatísticas',
      texto: 'Escolha entre visão diária, semanal ou mensal para ver quanto tempo você focou, além de um gráfico por dia.',
    },
  ];

  concluir(): void {
    this.storage.concluirTutorial();
    this.router.navigateByUrl('/temporizador');
  }

  /** Apaga os dados salvos no navegador (útil para refazer a demonstração). */
  reiniciarDados(): void {
    if (confirm('Apagar todos os dados do Pitoco neste navegador (Pitocoins, mascote, histórico)?')) {
      this.storage.reiniciarDados();
      this.router.navigateByUrl('/home');
    }
  }
}
