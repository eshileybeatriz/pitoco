import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { PitocoStorageService } from '../services/pitoco-storage.service';

/** UC2 — Login (com recuperação de senha por e-mail). */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(PitocoStorageService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly senha = signal('');
  readonly recuperando = signal(false);

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  aoDigitar(campo: 'email' | 'senha', evento: Event): void {
    this[campo].set((evento.target as HTMLInputElement).value);
    this.erro.set(null);
  }

  async entrar(): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);

    const resultado = await this.auth.entrar(this.email(), this.senha());
    this.enviando.set(false);

    if (!resultado.sucesso) {
      this.erro.set(resultado.mensagem);
      return;
    }
    this.storage.carregarUsuarioAtual(); // progresso próprio deste e-mail (novo e-mail = do zero)
    if (resultado.nome) this.storage.definirUsuario(resultado.nome);
    this.senha.set('');
    await this.router.navigateByUrl('/home');
  }

  // ---------- Fluxo alternativo: esquecimento de senha ----------

  abrirRecuperacao(): void {
    this.recuperando.set(true);
    this.erro.set(null);
    this.info.set(null);
  }

  voltarAoLogin(): void {
    this.recuperando.set(false);
    this.erro.set(null);
    this.info.set(null);
  }

  recuperar(): void {
    const resultado = this.auth.solicitarRecuperacao(this.email());
    if (resultado.sucesso) {
      this.info.set(resultado.mensagem);
      this.erro.set(null);
    } else {
      this.erro.set(resultado.mensagem);
      this.info.set(null);
    }
  }
}
