import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { AuthService, criteriosDaSenha } from '../services/auth.service';

/** UC1 — Cadastro. */
@Component({
  selector: 'app-cadastro',
  templateUrl: 'cadastro.page.html',
  styleUrls: ['cadastro.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent],
})
export class CadastroPage {
  private readonly auth = inject(AuthService);

  readonly nome = signal('');
  readonly email = signal('');
  readonly confirmaEmail = signal('');
  readonly senha = signal('');
  readonly confirmaSenha = signal('');

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  /** Lista de critérios que acende conforme o usuário digita a senha. */
  readonly criterios = computed(() => criteriosDaSenha(this.senha()));

  aoDigitar(campo: 'nome' | 'email' | 'confirmaEmail' | 'senha' | 'confirmaSenha', evento: Event): void {
    this[campo].set((evento.target as HTMLInputElement).value);
    this.erro.set(null);
  }

  async cadastrar(): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);

    const resultado = await this.auth.cadastrar({
      nome: this.nome(),
      email: this.email(),
      confirmaEmail: this.confirmaEmail(),
      senha: this.senha(),
      confirmaSenha: this.confirmaSenha(),
    });

    this.enviando.set(false);
    if (resultado.sucesso) {
      this.sucesso.set(resultado.mensagem);
      this.senha.set('');
      this.confirmaSenha.set('');
    } else {
      this.erro.set(resultado.mensagem);
    }
  }
}
