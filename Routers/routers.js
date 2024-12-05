import express from 'express';
import { createCartItem, updateCartItem, checkRefKey, getCartItems, deleteDetail, deleteRefKey, getCartItemsYear } from '../Models/CartModel.js'

const port = process.env.PORT || 3080;

const router = express.Router();

router.get("/", (req, res) => {
    res.send(`<h1>API executando na porta ${port}</h1>`);
});

router.get("/CartItems/:refKey", async (req, res) => {
    try {
        const resposta = await getCartItems(req.params.refKey);
        if(resposta){
            res.status(200).json(resposta);

        } else {
            res.status(400).send('Registro não encontrado!');
        }
        
    } catch (error) {
        res.status(400).json(error);
    }    
});

router.get("/CheckRefKey/:refKey", async (req, res) => {
    try {
        const resposta = await checkRefKey(req.params.refKey);
        res.status(200).json(resposta);
        
    } catch (error) {
        res.status(400).json(error);
    }
});

router.post("/CartItemIns", async (req, res) => {
    try {
        const newCartItem = req.body.cart;
        const resposta = await createCartItem(newCartItem);
        res.status(200).json(resposta);
    } catch (error) {
        res.status(400).json(error);
    }

});

router.post("/YearDetail", async (req, res) => {
    try {
        console.log(req.body);
        const refKeys = req.body;
        const resposta = await getCartItemsYear(refKeys);
        
        if(resposta){
            res.status(200).json(resposta);

        } else {
            res.status(400).send('Nenhum histórico encontrado');
        }
        
    } catch (error) {
        res.status(400).json(error);
    }    
});

router.put("/CartItemsUpd", async (req, res) => {
    try {
        const updCartItem = req.body.cart;
        const resposta = await updateCartItem(updCartItem);
        res.status(200).json(resposta);
    } catch (error) {
        res.status(400).json(error);
    }

});

router.delete("/CartDetailItem/:itemId", async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const resposta = await deleteDetail(itemId);
        console.log(resposta);
        res.status(200).json(resposta);
    } catch (error) {
        res.status(400).json(error);
    }
});

router.delete("/ItemsDetail/:refKey", async (req, res) => {
    try {
        const refKey = req.params.refKey;
        const resposta = await deleteRefKey(refKey);
        console.log(resposta);
        res.status(200).json(resposta);
    } catch (error) {
        res.status(400).json(error);
    }
});

export default router;