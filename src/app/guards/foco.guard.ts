import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

import { PitocoStorageService } from '../services/pitoco-storage.service';

/**
 * Bloqueia a saída do Temporizador enquanto um ciclo de FOCO está rodando
 * (UC7 / RN002). Para sair, é preciso concluir o ciclo ou usar o botão de emergência.
 * Cobre também o botão "voltar" do navegador e a troca manual da URL.
 */
export const focoGuard: CanDeactivateFn<unknown> = () => !inject(PitocoStorageService).isModoFoco();
