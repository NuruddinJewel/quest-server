import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express, { Request, Response } from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT: number = Number(process.env.PORT) || 5000;
const uri: string = process.env.MONGODB_URI as string;
const dbName: string = process.env.DB_NAME as string;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});


function parseQuantity(qty: any): number {
    if (!qty) return 0;
    if (typeof qty === 'object') {
        return Number(qty.Value ?? qty.value ?? 0);
    }
    const parsed = parseInt(qty, 10);
    return isNaN(parsed) ? 0 : parsed;
}

app.get("/", (req: Request, res: Response) => {
    res.send("Gaming Oasis Marketplace API running");
});

// (Popular/Featured) Games API
app.get("/api/games", async (req: Request, res: Response) => {
    try {
        const db = client.db(dbName);
        const { popular, featured, ownerId } = req.query;

        const query: Record<string, unknown> = {};
        if (popular === "true") query.isPopular = true;
        if (featured === "true") query.isFeatured = true;
        if (ownerId) query.ownerId = ownerId;

        const games = await db.collection("games").find(query).toArray();

        const sanitizedGames = games.map(game => ({
            ...game,
            quantity: parseQuantity(game.quantity),
            price: Number(game.price) || 0
        }));

        res.status(200).json(sanitizedGames);
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch games", details: error.message });
    }
});

//  Single Games API 
app.get("/api/games/:id", async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid Game ID structure" });
            return;
        }

        const db = client.db(dbName);
        const game = await db.collection("games").findOne({ _id: new ObjectId(id) });

        if (!game) {
            res.status(404).json({ message: "Game not found in the vault" });
            return;
        }

        res.status(200).json({
            ...game,
            quantity: parseQuantity(game.quantity),
            price: Number(game.price) || 0
        });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch game details", details: error.message });
    }
});

// New Game Add API
app.post("/api/games", async (req: Request, res: Response) => {
    try {
        const db = client.db(dbName);
        const newGame = req.body;

        if (newGame.quantity !== undefined) {
            newGame.quantity = parseQuantity(newGame.quantity);
        }
        if (newGame.price !== undefined) {
            newGame.price = Number(newGame.price) || 0;
        }

        const result = await db.collection("games").insertOne(newGame);
        res.status(201).json({ message: "Game CD added to vault successfully", insertedId: result.insertedId });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to add game", details: error.message });
    }
});

// Game Delete API
app.delete("/api/games/:id", async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid Game ID" });
            return;
        }

        const db = client.db(dbName);
        const result = await db.collection("games").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            res.status(404).json({ error: "Game not found" });
            return;
        }

        res.json({ message: "Game CD removed from vault successfully" });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to delete game", details: error.message });
    }
});

// Game Buy 
// app.patch("/api/games/:id/buy", async (req: Request, res: Response) => {
//     try {
//         const idParam = req.params.id;
//         const id = Array.isArray(idParam) ? idParam[0] : idParam;

//         if (!id || !ObjectId.isValid(id)) {
//             res.status(400).json({ error: "Invalid Game ID" });
//             return;
//         }

//         const { buyerId, buyerName, buyerEmail, quantity } = req.body;
//         const buyQty = Number(quantity) || 1;

//         const db = client.db(dbName);
//         const game = await db.collection("games").findOne({ _id: new ObjectId(id) });

//         if (!game) {
//             res.status(404).json({ error: "Game CD not found" });
//             return;
//         }

//         const currentQty = parseQuantity(game.quantity);

//         if (currentQty < buyQty) {
//             res.status(400).json({ error: "Not enough CD stock available in vault!" });
//             return;
//         }

//         // await db.collection("games").updateOne(
//         //     { _id: new ObjectId(id) },
//         //     { $set: { quantity: currentQty - buyQty } }
//         // );

//         // await db.collection("orders").insertOne({
//         //     gameId: id,
//         //     gameTitle: game.title,
//         //     buyerId,
//         //     buyerName,
//         //     buyerEmail,
//         //     price: Number(game.price) || 0,
//         //     quantity: buyQty,
//         //     purchasedAt: new Date(),
//         // });

//         //Pending Orders (2)
//         // const newOrder = {
//         //     gameId: id,
//         //     gameTitle: game.title,
//         //     buyerId,
//         //     buyerName,
//         //     buyerEmail,
//         //     price: Number(game.price) || 0,
//         //     quantity: buyQty,
//         //     status: "pending",
//         //     purchasedAt: new Date(),
//         // };

//         const result = await db.collection("orders").insertOne(newOrder);


//         res.json({ message: "Order placed successfully! Keep gaming!" });
//     } catch (error: any) {
//         res.status(500).json({ error: "Failed to process purchase", details: error.message });
//     }
// });

//Post
// Game Buy (Fixed TypeScript Errors)
app.post("/api/games/:id/buy", async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid Game ID" });
            return;
        }

        const { buyerId, buyerName, buyerEmail, quantity } = req.body;
        const buyQty = Number(quantity) || 1;

        const db = client.db(dbName);
        const game = await db.collection("games").findOne({ _id: new ObjectId(id) });

        if (!game) {
            res.status(404).json({ error: "Game CD not found" });
            return;
        }

        const currentQty = parseQuantity(game.stock);
        if (currentQty < buyQty) {
            res.status(400).json({ error: "Not enough CD stock available in vault!" });
            return;
        }

        // ✅ Correctly declared 'newOrder' before using it
        const newOrder = {
            gameId: id,
            gameTitle: game.title,
            buyerId,
            buyerName,
            buyerEmail,
            price: Number(game.price) || 0,
            quantity: buyQty,
            status: "pending",
            purchasedAt: new Date(),
        };

        // Result
        const result = await db.collection("orders").insertOne(newOrder);

        res.status(201).json({
            message: "Order requested! Awaiting admin approval.",
            orderId: result.insertedId
        });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to process purchase", details: error.message });
    }
});

// Admin Order Approval 
app.patch("/api/orders/:orderId/status", async (req: Request, res: Response) => {
    try {
        const orderIdParam = req.params.orderId;
        //  Safely extracting a single string from params to satisfy ObjectId type
        const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;
        const { status } = req.body;

        if (!orderId || !ObjectId.isValid(orderId)) {
            res.status(400).json({ error: "Invalid Order ID" });
            return;
        }

        if (!["approved", "rejected"].includes(status)) {
            res.status(400).json({ error: "Invalid status type. Must be approved or rejected." });
            return;
        }

        const db = client.db(dbName);

        const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }

        if (order.status !== "pending") {
            res.status(400).json({ error: `Order is already ${order.status}` });
            return;
        }

        if (status === "approved") {
            const game = await db.collection("games").findOne({ _id: new ObjectId(order.gameId) });
            const currentQty = parseQuantity(game?.quantity);

            if (!game || currentQty < order.quantity) {
                res.status(400).json({ error: "Cannot approve. Insufficient game stock!" });
                return;
            }

            await db.collection("games").updateOne(
                { _id: new ObjectId(order.gameId) },
                { $set: { quantity: currentQty - order.quantity } }
            );
        }

        await db.collection("orders").updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: status } }
        );

        res.json({ message: `Order successfully ${status}!` });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to update order status", details: error.message });
    }
});



// Order History
app.get("/api/orders", async (req: Request, res: Response) => {
    try {
        const db = client.db(dbName);
        const { buyerId } = req.query;

        const filter: Record<string, unknown> = {};
        if (buyerId) filter.buyerId = buyerId;

        const orders = await db.collection("orders").find(filter).toArray();
        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch orders", details: error.message });
    }
});

// Database Connection
async function startServer() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log(`Connected to MongoDB Atlas! Database: [${dbName}] 🚀`);

        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Database connection failed during startup:", error);
    }
}

startServer();