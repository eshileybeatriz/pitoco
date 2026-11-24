/**
 * Catálogo fixo da loja (UC6).
 * Os ids são gravados no localStorage (itensComprados / itensEquipados),
 * então evite renomear ids depois que o app estiver em uso.
 */

export type CategoriaItem = 'camiseta' | 'sapato' | 'comida' | 'bebida';

export interface ItemLoja {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  preco: number;
  icone: string;
  efeitoSaude?: number;
  efeitoFelicidade?: number;
}

export const CATALOGO_LOJA: ItemLoja[] = [
  { id: 'camisa_vermelha', nome: 'Camiseta Vermelha', categoria: 'camiseta', preco: 15, icone: '👕' },
  { id: 'camisa_azul', nome: 'Camiseta Azul', categoria: 'camiseta', preco: 20, icone: '🎽' },
  { id: 'sapato_azul', nome: 'Tênis Esportivo', categoria: 'sapato', preco: 25, icone: '👟' },
  { id: 'prato_saudavel', nome: 'Refeição Completa', categoria: 'comida', preco: 10, icone: '🥗', efeitoSaude: 20, efeitoFelicidade: 15 },
  { id: 'suco_natural', nome: 'Suco Refrescante', categoria: 'bebida', preco: 5, icone: '🧃', efeitoSaude: 10, efeitoFelicidade: 10 },
];

/** Roupas e sapatos são cosméticos: só podem ser comprados uma vez (RN006). */
export function ehCosmetico(categoria: CategoriaItem): boolean {
  return categoria === 'camiseta' || categoria === 'sapato';
}
