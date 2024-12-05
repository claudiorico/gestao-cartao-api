import { CartDetail, CartHeader, Classification } from "./CartModel.js";

export async function createCartItem() {

    const CartHeader = await CartHeader({
        reference: '112024',
        tatalvalue: 1200.25
    });

    await CartDetail.create({
        date: '20241110',
        description: 'Compra Mercado',
        value: 1000,
        referenceid: CartHeader.id
    });

    await Classification.create({
        classification: 'Mercado',
        classificationid: CartDetail.id
    });

    console.log("Registro criado com sucesso!");

}

export async function fetchCartItemWithAssociations() {
    const CartItemWithAssociations = await CartHeader.findOne({
        where: {reference: '112024'},
        include: [CartDetail,Classification],
    });
    console.log(JSON.stringify(CartItemWithAssociations, null, 2));
}

