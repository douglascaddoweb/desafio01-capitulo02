import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const carrinhoAnteriorRef = useRef<Product[]>();

  useEffect(() => {carrinhoAnteriorRef.current = cart;})

  const carrinhoValor = carrinhoAnteriorRef.current ?? cart

  useEffect(() => {
    if (carrinhoValor !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
    } 
  }, [cart, carrinhoValor])

  const addProduct = async (productId: number) => {
    try {

      const carrinho = [...cart]; //nova variavel para trabalhar com os dados.
      const produtoExistente = carrinho.find(item => item.id === productId);

      const responseStock:Stock = (await api.get(`/stock/${productId}`)).data
      const amount = produtoExistente ? produtoExistente.amount + 1 : 0;

      if (amount > responseStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (produtoExistente) {
        produtoExistente.amount = amount
      } else {
        const {data} = await api.get<Product>(`/products/${productId}`)
        const produto = {
          ...data,
          amount: 1
        }
        carrinho.push(produto)
      }
      setCart(carrinho)
      // localStorage.setItem("@RocketShoes:cart", JSON.stringify(carrinho))
    } catch(e:any) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const carrinho = [...cart]

      const product = carrinho.findIndex(item => item.id === productId)

      if (product === -1)
        throw Error()

      carrinho.splice(product, 1);

      setCart(carrinho)
      // localStorage.setItem("@RocketShoes:cart", JSON.stringify(carrinho))
    } catch (e:any) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        return

      const responseStock:Stock = (await api.get(`/stock/${productId}`)).data
      if (amount > responseStock.amount)
        return toast.error('Quantidade solicitada fora de estoque')

      const carrinho = [...cart]
      const product = carrinho.find(item => item.id === productId)
            
      if (!product)
        throw Error();

      product.amount = amount

      setCart(carrinho)
      // localStorage.setItem("@RocketShoes:cart", JSON.stringify(carrinho))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
