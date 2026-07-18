"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { products } from "@/lib/products";
import { supabase } from "@/lib/supabase";

type Product = (typeof products)[number];

type CartItem = Product & {
  quantity: number;
};

export default function Vendas() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountReceived, setAmountReceived] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function addToCart(product: Product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const received =
    Number(amountReceived.replace(",", ".")) || 0;

  const change = received - total;

  const hasEnoughMoney =
    cart.length > 0 && received >= total;

  async function finalizeSale() {
    if (cart.length === 0 || isSaving) {
      return;
    }

    if (!hasEnoughMoney) {
      alert(
        "O valor recebido é inferior ao total da venda."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirmar venda de ${total.toFixed(
        2
      )} €?\nTroco: ${change.toFixed(2)} €`
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const { data: sale, error: saleError } =
        await supabase
          .from("sales")
          .insert({
            total: total,
            amount_received: received,
            change_amount: change,
            payment_method: "cash",
          })
          .select("id")
          .single();

      if (saleError) {
        throw saleError;
      }

      if (!sale) {
        throw new Error(
          "O Supabase não devolveu o ID da venda."
        );
      }

      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        throw itemsError;
      }

      alert(
        `Venda guardada com sucesso!\nTroco: ${change.toFixed(
          2
        )} €`
      );

      setCart([]);
      setAmountReceived("");
    } catch (error) {
      console.error(
        "Erro ao guardar a venda:",
        error
      );

      alert(
        "Não foi possível guardar a venda. Verifica o Console para veres o erro."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-10 text-white">
        <h1 className="mb-8 text-4xl font-bold text-orange-500">
          Nova Venda
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Produtos */}
          <div className="rounded-2xl bg-slate-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">
              Produtos
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <button
                  key={`product-${product.id}`}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 p-6 text-xl font-bold transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block text-3xl">
                    {product.emoji}
                  </span>

                  <span className="mt-2 block">
                    {product.name}
                  </span>

                  <span className="mt-1 block text-base">
                    {product.price.toFixed(2)} €
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Carrinho */}
          <div className="rounded-2xl bg-slate-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">
              Carrinho
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-400">
                Ainda não existem produtos.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={`cart-item-${item.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg bg-slate-800 p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.emoji} {item.name}
                      </p>

                      <p className="text-sm text-gray-400">
                        {item.price.toFixed(2)} € cada
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(item.id)
                        }
                        disabled={isSaving}
                        className="h-10 w-10 rounded-lg bg-red-600 text-xl font-bold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        −
                      </button>

                      <span className="min-w-8 text-center text-xl font-bold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(item.id)
                        }
                        disabled={isSaving}
                        className="h-10 w-10 rounded-lg bg-green-600 text-xl font-bold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        +
                      </button>

                      <span className="min-w-24 text-right font-bold">
                        {(
                          item.price * item.quantity
                        ).toFixed(2)}{" "}
                        €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12">
              <h3 className="text-3xl font-bold text-orange-500">
                Total: {total.toFixed(2)} €
              </h3>

              <label
                htmlFor="amountReceived"
                className="mt-6 block text-lg font-semibold"
              >
                Valor recebido
              </label>

              <input
                id="amountReceived"
                type="number"
                min="0"
                step="0.01"
                value={amountReceived}
                onChange={(event) =>
                  setAmountReceived(
                    event.target.value
                  )
                }
                placeholder="0,00 €"
                disabled={
                  cart.length === 0 || isSaving
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-2xl font-bold text-white outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              />

              <div className="mt-4 rounded-xl bg-slate-800 p-4">
                <p className="text-lg text-gray-300">
                  Troco
                </p>

                <p
                  className={`text-3xl font-bold ${
                    hasEnoughMoney
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {cart.length === 0
                    ? "0.00 €"
                    : change >= 0
                      ? `${change.toFixed(2)} €`
                      : `Faltam ${Math.abs(
                          change
                        ).toFixed(2)} €`}
                </p>
              </div>

              <button
                type="button"
                onClick={finalizeSale}
                disabled={
                  cart.length === 0 ||
                  !hasEnoughMoney ||
                  isSaving
                }
                className="mt-6 w-full rounded-xl bg-green-600 py-5 text-xl font-bold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                {isSaving
                  ? "A guardar venda..."
                  : "Finalizar Venda"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}