const axios = require('axios');
const Transaction = require('../models/Transaction');

const API_URL = 'https://s3.amazonaws.com/roxiler.com/product_transaction.json';

// Initialize database
exports.initializeDatabase = async (req, res) => {
    try {
        const { data } = await axios.get(API_URL);
        await Transaction.deleteMany(); // Clear existing data
        await Transaction.insertMany(data);
        res.status(200).json({ message: 'Database initialized successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List transactions with search and pagination
exports.getTransactions = async (req, res) => {
    const { search = '', page = 1, perPage = 10, month } = req.query;
    const query = {
        dateOfSale: { $regex: `-${month}-`, $options: 'i' },
    };
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: { $regex: search } },
        ];
    }

    try {
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));
        const count = await Transaction.countDocuments(query);

        res.status(200).json({ transactions, count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Statistics
exports.getStatistics = async (req, res) => {
    const { month } = req.query;
    try {
        const transactions = await Transaction.find({
            dateOfSale: { $regex: `-${month}-`, $options: 'i' },
        });

        const totalSaleAmount = transactions.reduce((sum, t) => sum + t.price, 0);
        const soldItems = transactions.filter((t) => t.sold).length;
        const notSoldItems = transactions.length - soldItems;

        res.status(200).json({ totalSaleAmount, soldItems, notSoldItems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bar Chart
exports.getBarChart = async (req, res) => {
    const { month } = req.query;
    const priceRanges = [
        { range: '0-100', min: 0, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '201-300', min: 201, max: 300 },
        { range: '301-400', min: 301, max: 400 },
        { range: '401-500', min: 401, max: 500 },
        { range: '501-600', min: 501, max: 600 },
        { range: '601-700', min: 601, max: 700 },
        { range: '701-800', min: 701, max: 800 },
        { range: '801-900', min: 801, max: 900 },
        { range: '901+', min: 901, max: Infinity },
    ];

    try {
        const results = await Promise.all(
            priceRanges.map(async (range) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $regex: `-${month}-`, $options: 'i' },
                    price: { $gte: range.min, $lt: range.max },
                });
                return { range: range.range, count };
            })
        );
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Pie Chart
exports.getPieChart = async (req, res) => {
    const { month } = req.query;
    try {
        const transactions = await Transaction.find({
            dateOfSale: { $regex: `-${month}-`, $options: 'i' },
        });
        const categoryMap = {};

        transactions.forEach((t) => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
        });

        const result = Object.entries(categoryMap).map(([key, value]) => ({
            category: key,
            count: value,
        }));

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
