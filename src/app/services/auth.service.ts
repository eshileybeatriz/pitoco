import { Injectable, computed, signal } from '@angular/core';

/**
 * Autenticação do PITOCO (UC1 Cadastro e UC2 Login).
 *
 * Sem backend: as contas ficam no localStorage deste navegador. A senha nunca é
 * guardada em texto puro (só o hash SHA-256 com "sal"). Para produção, troque os
 * métodos abaixo por chamadas à API/Firebase mantendo as mesmas assinaturas.
 */

export interface Conta {
  nome: string;
  email: string; // sempre minúsculo
  senhaHash: string;
  sal: string;
  criadoEm: string;
}

export interface ResultadoAuth {
  sucesso: boolean;
  mensagem: string;
}

/** Critérios de segurança da senha (fluxo alternativo "Senha fraca" do UC1). */
export interface CriterioSenha {
  texto: string;
  ok: boolean;
}

const CHAVE_CONTAS = 'pitoco_contas_v1';
const CHAVE_SESSAO = 'pitoco_sessao_v1';
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function criteriosDaSenha(senha: string): CriterioSenha[] {
  return [
    { texto: 'Mínimo de 8 caracteres', ok: senha.length >= 8 },
    { texto: 'Uma letra maiúscula', ok: /[A-Z]/.test(senha) },
    { texto: 'Uma letra minúscula', ok: /[a-z]/.test(senha) },
    { texto: 'Um número', ok: /\d/.test(senha) },
  ];
}

export function senhaForte(senha: string): boolean {
  return criteriosDaSenha(senha).every((c) => c.ok);
}

export function emailValido(email: string): boolean {
  return REGEX_EMAIL.test(email.trim());
}

function lerContas(): Conta[] {
  try {
    const bruto = localStorage.getItem(CHAVE_CONTAS);
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(lista) ? (lista as Conta[]) : [];
  } catch {
    return [];
  }
}

function salvarContas(contas: Conta[]): void {
  try {
    localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
  } catch {
    // armazenamento cheio ou bloqueado
  }
}

function lerSessao(): string | null {
  try {
    return localStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
}

async function gerarHash(senha: string, sal: string): Promise<string> {
  const texto = `${sal}:${senha}`;
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(texto);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback (contextos sem Web Crypto, ex.: http fora de localhost): hash simples FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function gerarSal(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _email = signal<string | null>(lerSessao());

  /** Conta com sessão aberta (ou null). */
  readonly contaAtual = computed(() => {
    const email = this._email();
    return email ? (lerContas().find((c) => c.email === email) ?? null) : null;
  });

  readonly logado = computed(() => this.contaAtual() !== null);

  // ---------- UC1: Cadastro ----------

  async cadastrar(dados: {
    nome: string;
    email: string;
    confirmaEmail: string;
    senha: string;
    confirmaSenha: string;
  }): Promise<ResultadoAuth> {
    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();

    if (!nome || !email || !dados.confirmaEmail.trim() || !dados.senha || !dados.confirmaSenha) {
      return { sucesso: false, mensagem: 'Preencha todos os campos.' };
    }
    if (!emailValido(email)) {
      return { sucesso: false, mensagem: 'Informe um e-mail válido.' };
    }
    if (email !== dados.confirmaEmail.trim().toLowerCase()) {
      return { sucesso: false, mensagem: 'A confirmação de e-mail não confere com o e-mail informado.' };
    }
    // Fluxo alternativo: senha fraca
    if (!senhaForte(dados.senha)) {
      return {
        sucesso: false,
        mensagem: 'Senha fraca: ela não atende aos critérios de segurança. Escolha outra senha.',
      };
    }
    if (dados.senha !== dados.confirmaSenha) {
      return { sucesso: false, mensagem: 'A confirmação de senha não confere com a senha informada.' };
    }

    // Fluxo alternativo: e-mail já cadastrado
    const contas = lerContas();
    if (contas.some((c) => c.email === email)) {
      return { sucesso: false, mensagem: 'Este e-mail já está em uso. Informe outro endereço de e-mail.' };
    }

    const sal = gerarSal();
    const conta: Conta = {
      nome: nome.slice(0, 20),
      email,
      sal,
      senhaHash: await gerarHash(dados.senha, sal),
      criadoEm: new Date().toISOString(),
    };
    salvarContas([...contas, conta]);
    return { sucesso: true, mensagem: 'Cadastro realizado com sucesso!' };
  }

  // ---------- UC2: Login ----------

  async entrar(emailInformado: string, senha: string): Promise<ResultadoAuth & { nome?: string }> {
    const email = emailInformado.trim().toLowerCase();
    const invalido = { sucesso: false, mensagem: 'E-mail ou senha incorretos. Tente novamente.' };

    if (!email || !senha) return invalido;

    const conta = lerContas().find((c) => c.email === email);
    if (!conta) return invalido;
    if ((await gerarHash(senha, conta.sal)) !== conta.senhaHash) return invalido;

    try {
      localStorage.setItem(CHAVE_SESSAO, conta.email);
    } catch {
      // sem persistir a sessão, o login vale só até recarregar a página
    }
    this._email.set(conta.email);
    return { sucesso: true, mensagem: 'Login realizado com sucesso!', nome: conta.nome };
  }

  sair(): void {
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // ignora
    }
    this._email.set(null);
  }

  /**
   * Fluxo alternativo "Esquecimento de senha" (UC2).
   * Sem servidor de e-mail neste protótipo, o envio é simulado. A resposta é sempre a
   * mesma (existindo ou não a conta) para não revelar quais e-mails estão cadastrados.
   */
  solicitarRecuperacao(emailInformado: string): ResultadoAuth {
    const email = emailInformado.trim();
    if (!emailValido(email)) {
      return { sucesso: false, mensagem: 'Informe um e-mail válido para recuperar a senha.' };
    }
    return {
      sucesso: true,
      mensagem: `Enviamos as instruções de recuperação para ${email}. Verifique sua caixa de entrada e o spam.`,
    };
  }
}
