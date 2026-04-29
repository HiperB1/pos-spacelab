import { 
  getProdutos as getProdutosDB, 
  getComponentes as getComponentesDB, 
  addProduto as addProdutoDB, 
  updateProductRow as updateProductRowDB, 
  deleteProductRow as deleteProductRowDB, 
  addComponente as addComponenteDB, 
  removeComponente as removeComponenteDB,
  assembleProduto as assembleProdutoDB,
  disassembleProduto as disassembleProdutoDB
} from '../lib/database';
import type { Produto } from '../lib/types';
import { toast } from 'sonner';

export const getProdutos = getProdutosDB;
export const getComponentes = getComponentesDB;
export const addComponente = addComponenteDB;
export const removeComponente = removeComponenteDB;
export const getComponentesByProducto = getComponentesDB;
export const updateProductRow = updateProductRowDB;
export const deleteProductRow = deleteProductRowDB;
export const assembleProducto = assembleProdutoDB;
export const disassembleProducto = disassembleProdutoDB;

export function addProduto(data: Omit<Produto, 'id'>): Produto {
  const item = addProdutoDB(data);
  toast.success('Producto creado exitosamente');
  return item;
}

export function updateProducto(id: string, data: Partial<Produto>): void {
  updateProductRowDB(id, data);
  toast.success('Producto actualizado');
}

export function deleteProducto(id: string): void {
  deleteProductRowDB(id);
  toast.success('Producto eliminado');
}

export function getDisponibilidadeParaEnsamblar() {
  const produtos = getProdutosDB();
  
  return produtos.map((produto: any) => {
    const componentes = getComponentesDB(produto.id);
    
    const componentesComDisponibilidade = componentes.map((c: any) => ({
      subprodutoId: c.subproduto_id,
      subprodutoNome: c.subproduto_nome,
      necessidadea: c.quantidade_necesaria,
      quantidadeDisponivel: c.subproduto_quantidade,
      suficiente: c.subproduto_quantidade >= c.quantidade_necesaria
    }));
    
    return {
      produto,
      podeEnsamblar: componentesComDisponibilidade.every((c: any) => c.suficiente),
      componentes: componentesComDisponibilidade
    };
  });
}