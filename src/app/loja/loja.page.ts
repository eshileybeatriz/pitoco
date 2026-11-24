import { Component, inject, signal } from '@angular/core';
import { IonContent, IonMenuButton } from '@ionic/angular';

import { ItemLoja, PitocoStorageService, ResultadoCompra } from '../services/pitoco-storage.service';
import { PitocoAvatarComponent } from '../shared/pitoco-avatar/pitoco-avatar.component';

@Component({
  selector: 'app-loja',
  templateUrl: 'loja.page.html',
  styleUrls: ['loja.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton, PitocoAvatarComponent],
})
export class LojaPage {
  readonly storage = inject(PitocoStorageService);

  readonly roupas = this.storage.catalogoLoja.filter((i) => this.ehCosmetico(i));
  readonly comidas = this.storage.catalogoLoja.filter((i) => !this.ehCosmetico(i));

  readonly feedback = signal<ResultadoCompra | null>(null);

  ehCosmetico(item: ItemLoja): boolean {
    return item.categoria === 'camiseta' || item.categoria === 'sapato';
  }

  possui(item: ItemLoja): boolean {
    return this.storage.dados().inventario.includes(item.id);
  }

  equipado(item: ItemLoja): boolean {
    const m = this.storage.mascote();
    return m.camisetaEquipada === item.id || m.sapatoEquipado === item.id;
  }

  descricao(item: ItemLoja): string {
    if (item.categoria === 'camiseta') return 'Camiseta';
    if (item.categoria === 'sapato') return 'Sapato';
    const partes: string[] = [];
    if (item.efeitoSaude) partes.push(`+${item.efeitoSaude} saúde`);
    if (item.efeitoFelicidade) partes.push(`+${item.efeitoFelicidade} felicidade`);
    return partes.join(' · ');
  }

  comprar(item: ItemLoja): void {
    this.feedback.set(this.storage.comprarItem(item.id));
  }

  alternarEquipar(item: ItemLoja): void {
    this.storage.equiparItem(item.id);
    this.feedback.set({
      sucesso: true,
      mensagem: this.equipado(item) ? `${item.nome} equipado!` : `${item.nome} removido.`,
    });
  }
}
