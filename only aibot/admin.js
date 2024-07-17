const express = require('express');
const app = express();
const BP = require('body-parser');
app.use(BP.json());
app.use(express.urlencoded({ extended: false }))
const axios = require('axios')
const BigNumber = require('bignumber.js')
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const fs = require('fs');
const multer = require('multer')
const moment = require('moment');
const Moment = require('moment-timezone');
const https = require('https')
const mysql = require('mysql');

// const server = https.createServer({
//     key: fs.readFileSync('/etc/letsencrypt/live/beta.taborr.com/privkey.pem'),
//     cert: fs.readFileSync('/etc/letsencrypt/live/beta.taborr.com/fullchain.pem'),
//     ca: fs.readFileSync('/etc/letsencrypt/live/beta.taborr.com/chain.pem')
// }, app);


const DB = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'ARBI',
})

DB.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

const corsOptions = {
    origin: ['http://localhost', '*'],
    optionsSuccessStatus: 200,
};

app.use(cors('*'));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// app.use(cors(corsOptions));


const upload = multer();


const util = require('util');
const { Server } = require('net');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'ARBI',
});

const queryAsync = util.promisify(connection.query).bind(connection);


const DBNAME = 'ARBI';

app.post('/apiv4/SaveTransactions', async (req, res) => {
    try {
        const {
            borrowAmount,
            borrowAmountUSD,
            userAddress,
            profitUSD,
            profitPercentage,
            trxHash,
            pair1,
            pair2,
            status,
            platform_fee,
            Date
        } = req.body;
        console.log('/apiv4/SaveTransactions', req.body)

        // if (!borrowAmount || !userAddress || !borrowAmountUSD || !Date || !profitPercentage || !pair1 || !pair2 || !platform_fee || !trxHash) {
        //     return res.status(400).json({ status: 'failed', msg: 'Missing required fields' });
        // }

        const randomId = uuidv4();

        DB.query(`USE ${DBNAME}`, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: 'failed', msg: 'Error saving transaction: Internal Server Error' });
            }

            const sql = `INSERT INTO transactions 
                      (borrowAmount, userAddress, borrowAmountUSD, profitPercentage, profitUSD, trxHash, pair1, pair2, status, platformFee, Date, uniqueId) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [borrowAmount, userAddress, borrowAmountUSD, profitPercentage, profitUSD, trxHash, pair1, pair2, status, platform_fee, Date, randomId];

            DB.query(sql, values, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: 'failed', msg: 'Error saving transaction' });
                }
                if (result.affectedRows > 0) {
                    return res.status(200).json({ status: 'success', key: randomId });
                } else {
                    return res.status(500).json({ status: 'failed', msg: 'Error saving transaction' });
                }
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error saving transaction' });
    }
});


app.get('/apiv4/updateTransactions', async (req, res) => {
    try {
        const { trxHash, key, status } = req.query;

        if (!trxHash || !key || !status) {
            return res.status(400).json({ status: 'failed', msg: 'Missing required parameters.' });
        }

        const sql = `UPDATE transactions 
                    SET trxHash = ?, status = ?
                    WHERE uniqueId = ?`;

        const values = [trxHash, status, key];
        DB.query(USE`${DBNAME}`, async (Err) => {
            if (Err) {
                return res.status(404).json({ status: 'failed', msg: 'Transaction not found.' });
            }
            DB.query(sql, values, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: 'failed', msg: 'Error updating transaction.' });
                }
                if (result.affectedRows > 0) {
                    return res.json({ status: 'success', msg: 'Transaction updated successfully.' });
                } else {
                    return res.status(404).json({ status: 'failed', msg: 'Transaction not found.' });
                }
            });
        })

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error saving transaction.' });
    }
});


app.get('/apiv4/updateTransactionsUSD', async (req, res) => {
    try {
        const { trxHash, borrowUSD } = req.query;

        if (!trxHash || !borrowUSD) {
            return res.json({ status: 'failed', msg: 'Missing required parameters.' });
        }

        const updatedTransaction = await transactionModel.findOneAndUpdate(
            { trxHash: trxHash },
            { $set: { borrowAmountUSD: parseFloat(borrowUSD) } },
            { new: true }
        );

        if (updatedTransaction) {
            return res.json({ status: 'success', msg: 'Transaction saved successfully.' });
        } else {
            return res.status(404).json({ status: 'failed', msg: 'Transaction not found.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error saving transaction.' });
    }
})


app.get('/apiv4/getUserTransactions', async (req, res) => {
    try {
        const walletAddress = req.query.walletAddress;
        const regex = `^${walletAddress}$`;

        const totalProfitQuery = `
        SELECT
        status,
        SUM(CASE WHEN profitUSD REGEXP '^[0-9]+[.][0-9]+$' THEN CAST(profitUSD AS DECIMAL(10,2)) ELSE 0 END) AS profitAmount,
        SUM(CAST(borrowAmountUSD AS DECIMAL(10,2))) AS borrowedAmount
        FROM transactions
        WHERE userAddress REGEXP ?
        AND trxHash IS NOT NULL AND trxHash != ''
        GROUP BY status;
        `;
        const totalProfit = await queryAsync(totalProfitQuery, [regex]);

        const ProfitQuery = `
        SELECT
        SUM(CASE WHEN profitUSD REGEXP '^[0-9]+[.][0-9]+$' THEN CAST(profitUSD AS DECIMAL(10,2)) ELSE 0 END) AS profitAmount
        FROM transactions
        WHERE userAddress REGEXP ?
        AND status = 'success'
        `;
        const Profit = await queryAsync(ProfitQuery, [regex]);
        const totalProfitUsd = Profit[0].profitAmount;

        const totalCountQuery = await queryAsync(`SELECT COUNT(*) AS totalCount 
        FROM transactions 
        WHERE trxHash IS NOT NULL 
          AND trxHash != '' 
          AND userAddress REGEXP ?`, [regex]);

        const totalCount = totalCountQuery[0].totalCount;
        return res.status(200).json({
            status: 'true',
            amount: totalProfitUsd,
            total: totalCount,
            // borrowedAmount: totalProfit ? parseFloat(totalProfit[0].borrowedAmount + totalProfit[1].borrowedAmount).toFixed(4) : 0
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 'failed',
            msg: 'Error while getting the user transactions.',
        });
    }
});


app.get('/apiv4/getAllTransactions', async (req, res) => {
    try {

        const totalProfitQuery = `
        SELECT
        status,
        SUM(CASE WHEN profitUSD REGEXP '^[0-9]+[.][0-9]+$' THEN CAST(profitUSD AS DECIMAL(10,2)) ELSE 0 END) AS profitAmount,
        SUM(CAST(borrowAmountUSD AS DECIMAL(10,2))) AS borrowedAmount
        FROM transactions
        where trxHash IS NOT NULL AND trxHash != ''
        GROUP BY status;
        `;
        const totalProfit = await queryAsync(totalProfitQuery);
        const toptenTrans = await queryAsync(`
        SELECT *
        FROM transactions
        WHERE profitPercentage >= 40 AND profitPercentage <= 50
        ORDER BY profitPercentage DESC
        LIMIT 20
        `);
        const totalCountQuery = await queryAsync('SELECT COUNT(*) AS totalCount FROM transactions');
        const totalCount = totalCountQuery[0].totalCount;
        return res.status(200).json({
            status: 'true',
            amount: totalProfit,
            topTen: toptenTrans,
            total: totalCount
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 'failed',
            msg: 'Error while getting the user transactions.',
        });
    }
});


app.get('/apiv4/getUsersCount', async (req, res) => {
    try {
        // Fetch subscription counts
        const subscriptionQuery = `
        SELECT 
          COUNT(DISTINCT userAddress) AS subsCount,
          COUNT(DISTINCT CASE WHEN Subscription_Plan = 'license1' THEN userAddress END) AS license1Count,
          COUNT(DISTINCT CASE WHEN Subscription_Plan = 'license2' THEN userAddress END) AS license2Count,
          COUNT(DISTINCT CASE WHEN Subscription_Plan = 'license3' THEN userAddress END) AS license3Count,
          COUNT(DISTINCT CASE WHEN Subscription_Plan = 'license4' THEN userAddress END) AS license4Count,
          COUNT(DISTINCT CASE WHEN Subscription_Plan = 'license5' THEN userAddress END) AS license5Count
        FROM Purchases;
      `;
        const subscriptionResult = await queryAsync(subscriptionQuery);

        // Fetch transaction counts
        const transactionQuery = `
        SELECT 
        COUNT(DISTINCT userAddress) AS userCount,
        COUNT(*) AS totalTransactions, 
        SUM(CASE WHEN profitUSD > 0 THEN CAST(profitUSD AS DECIMAL(10,2)) ELSE 0 END) AS totalProfitUSD, 
        SUM(borrowAmountUSD) AS borrowAmount
        FROM transactions
        WHERE trxHash IS NOT NULL AND trxHash != '';    
      `;
        const transactionResult = await queryAsync(transactionQuery);
        // Format and send response

        const WhiteistingQuery = `
        SELECT 
        COUNT(DISTINCT userAddress) AS userCount
        FROM whiteList;    
      `;
        const WhiteListUserResult = await queryAsync(WhiteistingQuery);

        const response = {
            status: 'success',
            userCount: WhiteListUserResult[0].userCount,
            transactionCount: transactionResult[0].totalTransactions,
            totalProfitUSD: (transactionResult[0].totalProfitUSD).toFixed(2),
            borrowAmount: (transactionResult[0].borrowAmount).toFixed(2),
            subsCount: subscriptionResult[0].subsCount,
            separateCount: {
                license1Count: subscriptionResult[0].license1Count,
                license2Count: subscriptionResult[0].license2Count,
                license3Count: subscriptionResult[0].license3Count,
                license4Count: subscriptionResult[0].license4Count,
                license5Count: subscriptionResult[0].license5Count,
            },
        };
        return res.status(200).json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 'failed',
            msg: 'Error while getting user transactions.',
        });
    }
});


// app.get('/apiv4/getUsersInfo', async (req, res) => {
//     try {
//         const usersInfoQuery = `
//             SELECT userAddress,
//                    COUNT(*) AS transactionCount,
//                    DATE_FORMAT(MIN(createdAt), '%d/%m/%Y') AS firstTransactionDate,
//                    SUM(CASE WHEN status = 'success' THEN profitUSD ELSE 0 END) AS totalProfitAmount
//                    FROM transactions
//                    WHERE trxHash IS NOT NULL AND trxHash != ''
//             GROUP BY userAddress;
//         `;

//         const result = await queryAsync(usersInfoQuery);
//         const usersInfo = result.map(user => ({
//             userAddress: user.userAddress,
//             transactionCount: user.transactionCount,
//             firstTransactionDate: user.firstTransactionDate,
//             totalProfitUSD: parseFloat(user.totalProfitAmount).toFixed(4)
//         }));

//         return res.status(200).json({
//             status: 'success',
//             usersInfo: usersInfo,
//         });

//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({
//             status: 'failed',
//             msg: 'Error while getting users information.',
//         });
//     }
// });

// app.get('/apiv4/getUsersInfo', async (req, res) => {
//     try {
//         const usersInfoQuery = `
//             SELECT 
//                 w.userAddress,
//                 DATE_FORMAT(w.date, '%d/%m/%Y') AS date,
//                 w.TotalTradeLimit,
//                 COUNT(t.trxHash) AS transactionCount,
//                 DATE_FORMAT(MIN(t.createdAt), '%d/%m/%Y') AS firstTransactionDate,
//                 SUM(CASE WHEN t.status = 'success' THEN t.profitUSD ELSE 0 END) AS totalProfitAmount
//             FROM 
//                 whiteList w
//             LEFT JOIN 
//                 transactions t ON w.userAddress = t.userAddress
//             WHERE 
//                 t.trxHash IS NOT NULL AND t.trxHash != ''
//             GROUP BY 
//                 w.userAddress, w.date, w.TotalTradeLimit;
//         `;

//         const result = await queryAsync(usersInfoQuery);
//         const usersInfo = result.map(user => ({
//             userAddress: user.userAddress,
//             date: user.date,
//             TotalTradeLimit: user.TotalTradeLimit,
//             transactionCount: user.transactionCount,
//             firstTransactionDate: user.firstTransactionDate,
//             totalProfitUSD: parseFloat(user.totalProfitAmount).toFixed(4)
//         }));

//         return res.status(200).json({
//             status: 'success',
//             usersInfo: usersInfo,
//         });

//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({
//             status: 'failed',
//             msg: 'Error while getting users information.',
//         });
//     }
// });

app.get('/apiv4/getUsersInfo', async (req, res) => {
    try {
        const usersInfoQuery = `
            SELECT 
                w.userAddress,
                DATE_FORMAT(w.date, '%d/%m/%Y') AS date,
                w.TotalTradeLimit,
                COUNT(t.trxHash) AS transactionCount,
                DATE_FORMAT(MIN(w.createdAt), '%d/%m/%Y') AS firstTransactionDate,
                SUM(CASE WHEN t.status = 'success' THEN t.profitUSD ELSE 0 END) AS totalProfitAmount
            FROM 
                whiteList w
            LEFT JOIN 
                transactions t ON w.userAddress = t.userAddress AND t.trxHash IS NOT NULL AND t.trxHash != ''
            GROUP BY 
                w.userAddress, w.date, w.TotalTradeLimit;
        `;

        const result = await queryAsync(usersInfoQuery);
        const usersInfo = result.map(user => ({
            userAddress: user.userAddress,
            date: user.date,
            TotalTradeLimit: user.TotalTradeLimit,
            transactionCount: user.transactionCount,
            firstTransactionDate: user.firstTransactionDate, // Handle the case where there's no transaction
            totalProfitUSD: parseFloat(user.totalProfitAmount || 0).toFixed(4) // Handle the case where there's no profit
        }));

        usersInfo.sort((a, b) => b.totalProfitUSD - a.totalProfitUSD);

        return res.status(200).json({
            status: 'success',
            usersInfo: usersInfo,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 'failed',
            msg: 'Error while getting users information.',
        });
    }
});


app.get('/apiv4/getSubscriptionInfo', async (req, res) => {
    try {
        const usersSubscriptionInfoQuery = `
        SELECT * FROM Purchases
        ORDER BY createdAt DESC;
        `;

        const result = await queryAsync(usersSubscriptionInfoQuery);

        const SubscriptionInfo = result.map(user => ({
            userAddress: user.userAddress,
            plan: user.Subscription_Plan,
            amount: user.PaymentAmount,
            type: user.PaymentMethod,
            hash: user.trxHash,
            date: user.createdAt
        }));

        return res.status(200).json({
            status: 'success',
            SubscriptionInfo: SubscriptionInfo,
        });


    } catch (err) {
        console.error('Error fetching subscription information:', err);
        return res.status(500).json({
            status: 'failed',
            msg: 'Error while getting subscription information.',
        });
    }
});

function formatNumber(number) {
    const abbreviations = ['k', 'M', 'B', 'T'];
    for (let i = abbreviations.length - 1; i >= 0; i--) {
        const size = Math.pow(10, (i + 1) * 3);
        if (size <= number) {
            const formattedNumber = Math.round((number / size) * 10) / 10;
            return formattedNumber + abbreviations[i];
        }
    }
    return number;
}

app.get('/apiv4/getTransactionsCountForAddress', async (req, res) => {
    try {
        const { walletAddress } = req.query;
        const regex = `^${walletAddress}$`;

        const tenDaysAgo = moment().subtract(10, 'days').startOf('day');
        const today = moment().startOf('day');

        const dateCountsQuery = `
        SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') as transactionDate, COUNT(*) as count
        FROM transactions
        WHERE userAddress REGEXP ?
        AND trxHash IS NOT NULL AND trxHash != ''
        AND createdAt >= ?
        AND createdAt < ?
        GROUP BY transactionDate
        `;
        const transactions = await queryAsync(dateCountsQuery, [regex, tenDaysAgo.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]);
        const dateCounts = {};
        transactions.forEach(transaction => {
            dateCounts[transaction.transactionDate] = transaction.count;
        });
        const currentDate = moment(tenDaysAgo);
        const output = {};
        while (currentDate.isBefore(today)) {
            const dateString = currentDate.format('YYYY-MM-DD');
            output[dateString] = dateCounts[dateString] || 0;
            currentDate.add(1, 'day');
        }

        return res.send(output);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error fetching User Transaction Count.' });
    }
});


app.get('/apiv4/getUsersTransactions', async (req, res) => {
    try {
        const { walletAddress } = req.query;

        const getTransactionsQuery = `
        SELECT *
        FROM transactions
        WHERE trxHash IS NOT NULL AND trxHash != '' AND userAddress = ?
        ORDER BY createdAt DESC`;

        const transactions = await queryAsync(getTransactionsQuery, [walletAddress]);

        if (transactions.length > 0) {
            return res.json({ status: 'success', data: transactions });
        } else {
            return res.json({ status: 'failed', msg: 'Transactions not found.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error fetching transactions.' });
    }
});


app.get('/apiv4/getTransactions', async (req, res) => {
    try {

        const getTransactionsQuery = `
        SELECT *
        FROM transactions
        WHERE trxHash IS NOT NULL AND trxHash != ''
        ORDER BY createdAt DESC`;

        const transactions = await queryAsync(getTransactionsQuery);

        if (transactions.length > 0) {
            return res.json({ status: 'success', data: transactions });
        } else {
            return res.json({ status: 'failed', msg: 'Transactions not found.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error fetching transactions.' });
    }
});


app.get('/apiv4/getTransactionsCountForUser', async (req, res) => {
    const walletAddress = req.query.walletAddress;

    try {
        const today = moment().startOf('day');
        const tenDaysAgo = moment(today).subtract(7, 'days').startOf('day');
        const dateCounts = {};
        const dateSequence = [];

        for (let i = 0; i <= 6; i++) {
            const date = moment(today).subtract(i, 'days').format('YYYY-MM-DD');
            dateSequence.push(date);
        }

        // const datePlaceholders = dateSequence.map(() => 'SELECT ? AS date').join(' UNION ALL ');

        // const transactions = await queryAsync(`
        //     SELECT dateSequence.date AS transactionDate, COUNT(transactions.id) AS transactionCount
        //     FROM (
        //         ${datePlaceholders}
        //     ) AS dateSequence
        //     LEFT JOIN transactions 
        //         ON DATE_FORMAT(transactions.createdAt, '%Y-%m-%d') = dateSequence.date 
        //         AND transactions.trxHash IS NOT NULL 
        //         AND transactions.trxHash != '' 
        //         AND transactions.createdAt >= ? 
        //         AND transactions.createdAt < ? 
        //         AND transactions.userAddress = ?
        //     GROUP BY dateSequence.date
        //     ORDER BY dateSequence.date ASC
        // `, [...dateSequence, tenDaysAgo.format('YYYY-MM-DD'), today.format('YYYY-MM-DD'), walletAddress]);

        // let data = [];
        // transactions.forEach(transaction => {
        //     data.push(transaction.transactionCount);
        // });
        // console.log(data);

        const promises = dateSequence.map(async date => {
            const query = `SELECT COUNT(*) AS transactionCount
                           FROM transactions
                           WHERE trxHash IS NOT NULL 
                            AND trxHash != '' AND
                            DATE(createdAt) = DATE(?)
                           AND userAddress = ?`;

            const result = await queryAsync(query, [date, walletAddress]);
            return result[0].transactionCount || 0;
        });

        const transactionCounts = await Promise.all(promises);
        const reversedTransactionCounts = transactionCounts.reverse();
        res.json(reversedTransactionCounts);

        //res.send(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error fetching Transactions Count.' });
    }
});


app.get('/apiv4/getTransactionsCountForPlatform', async (req, res) => {
    try {
        const today = moment();
        const dateSequence = [];

        for (let i = 0; i < 7; i++) {
            const date = moment(today).subtract(i, 'days').format('YYYY-MM-DD HH:mm:ss');
            dateSequence.push(date);
        }

        const promises = dateSequence.map(async date => {
            const query = `SELECT COUNT(*) AS transactionCount
                           FROM transactions
                           WHERE DATE(createdAt) = DATE(?)
                           AND trxHash IS NOT NULL`;

            const result = await queryAsync(query, [date]);
            return result[0].transactionCount || 0;
        });

        const transactionCounts = await Promise.all(promises);
        const reversedTransactionCounts = transactionCounts.reverse();
        res.json(reversedTransactionCounts);
    } catch (error) {
        console.error('Error fetching transaction counts:', error);
        res.status(500).json({ status: 'failed', message: 'Error fetching transaction counts' });
    }
});


app.get('/apiv4/getUsersCountForPlatform', async (req, res) => {
    try {
        const dateSequence = [];
        const today = moment().startOf('day');

        for (let i = 0; i < 7; i++) {
            const date = moment(today).subtract(i, 'days').format('YYYY-MM-DD');
            dateSequence.push(date);
        }

        const promises = dateSequence.map(async date => {
            const query = `
                SELECT COUNT(DISTINCT userAddress) AS userCount
                FROM whiteList
                WHERE DATE(createdAt) = ?
            `;
            const result = await queryAsync(query, [date]);
            return result.length > 0 ? result[0].userCount : 0;
        });

        let userCounts = await Promise.all(promises);

        userCounts = userCounts.reverse();
        res.json(userCounts);
    } catch (error) {
        console.error('Error fetching user counts:', error);
        res.status(500).json({ status: 'failed', message: 'Error fetching user counts' });
    }
});


app.get('/apiv4/getTransactionsByAddress', async (req, res) => {
    try {
        const { walletAddress } = req.query;
        if (!walletAddress) {
            return res.status(400).json({ status: 'failed', msg: 'walletAddress is required.' });
        }

        const regex = `^${walletAddress}$`;

        const transactions = await queryAsync(`
            SELECT *
            FROM transactions
            WHERE userAddress REGEXP ?
                AND trxHash IS NOT NULL AND trxHash != ''
        `, [regex]);

        if (transactions.length > 0) {

            const positiveProfit = transactions
                .map(transaction => parseFloat(transaction.profitUSD))
                .filter(profit => profit > 0)
                .reduce((acc, profit) => acc + profit, 0);

            const totalBorrowAmount = transactions
                .map(transaction => parseFloat(transaction.borrowAmountUSD))
                .reduce((acc, borrowAmount) => acc + borrowAmount, 0);

            return res.json({
                status: 'success',
                data: transactions,
                totalProfitUSD: await formatNumber(positiveProfit.toFixed(2)),
                borrowAmount: await formatNumber(totalBorrowAmount.toFixed(2)),
            });
        } else {
            return res.json({ status: 'failed', msg: 'Transaction not found.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error retrieving transactions.' });
    }
});


app.get('/apiv4/AdminLogin', async (req, res) => {
    try {
        const { email, password } = req.query;
        if (email == 'admin@taborr.com' && password == 'Demo@123') {
            return res.json({ status: 'success', msg: 'Logged in Successfully' });
        } else {
            return res.status(404).json({ status: 'failed', msg: 'Transaction not found.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error saving transaction.' });
    }
})


app.get('/apiv4/WhiteListUser', async (req, res) => {
    try {
        const { walletAddress, plan, chainId } = req.query;
        const regex = `^${walletAddress}$`;
        const existingUser = await queryAsync(`
        SELECT * FROM whiteList
        WHERE userAddress REGEXP ? AND chainId = ?
        `, [regex, chainId]);
        const newTradeLimit = plan === 'license1' ? 2500 :
            plan === 'license2' ? 5000 :
                50000;

        if (existingUser.length === 0) {
            await queryAsync(`
            INSERT INTO whiteList (userAddress, Whitelist_type, TotalTradeLimit, LimitUsed, LimitRemaining, Purchases, status, chainId)
            VALUES (?, ?, ?, 0, ?, ?, 'whitelisted',?)`, [walletAddress, plan, newTradeLimit, newTradeLimit, plan, chainId]);
            res.send({ status: 'success', msg: 'Whitelist plan Added to New User' });
        } else {
            const userTransactions = await queryAsync(`
                SELECT * FROM transactions
                WHERE userAddress REGEXP ? AND trxHash IS NOT NULL AND trxHash != '' AND chainId = ?
            `, [regex, chainId]);

            const totalBorrowAmountUSD = userTransactions.reduce((sum, transaction) => {
                const amount = parseFloat(transaction.borrowAmountUSD);
                if (!isNaN(amount)) {
                    return sum + amount;
                }
                return sum;
            }, 0);

            const totalTradeLimit = parseFloat(existingUser[0].TotalTradeLimit) + newTradeLimit;


            const sqlQuery = `
            UPDATE whiteList
            SET 
                TotalTradeLimit = ?, 
                LimitUsed = ?, 
                LimitRemaining = ?, 
                Purchases = IF(
                    Purchases = '', 
                    ?, 
                    CONCAT(Purchases, IF(RIGHT(Purchases, 1) = ',', '', ','), ?)
                )
            WHERE 
                userAddress REGEXP ? 
                AND chainId = ?;
        `;

            const queryParams = [
                totalTradeLimit,
                totalBorrowAmountUSD,
                totalTradeLimit - totalBorrowAmountUSD,
                plan,
                plan,
                regex,
                chainId
            ];

            await queryAsync(sqlQuery, queryParams);

            res.send({ status: 'success', msg: 'Existing Users Plan Updated Successfully' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: err });
    }
});


app.post('/apiv4/WhiteListUsersBatch', async (req, res) => {
    try {
        const users = req.body.user;
        const chainId = req.body.chainId;
        const result = await Promise.all(users.map(async (user) => {
            const { userAddress, plan } = user;

            const regex = `^${userAddress}$`;
            const existingUser = await queryAsync(`
                SELECT * FROM whiteList
                WHERE userAddress REGEXP ? AND chainId = ?
            `, [regex, chainId]);

            const newTradeLimit = plan === 'license1' ? 2500 :
                plan === 'license2' ? 5000 :
                    50000;

            if (existingUser.length === 0) {
                await queryAsync(`
            INSERT INTO whiteList (userAddress, Whitelist_type, TotalTradeLimit, LimitUsed, LimitRemaining, Purchases, status,chainId)
            VALUES (?, ?, ?, 0, ?, ?, 'whitelisted', ? )
            `, [userAddress, plan, newTradeLimit, newTradeLimit, plan, chainId]);
            } else {
                const userTransactions = await queryAsync(`
                SELECT * FROM transactions
                WHERE userAddress REGEXP ? AND trxHash IS NOT NULL AND trxHash != '' AND chainId = ?
                `, [regex, chainId]);

                const totalBorrowAmountUSD = userTransactions.reduce((sum, transaction) => {
                    const amount = parseFloat(transaction.borrowAmountUSD);
                    if (!isNaN(amount)) {
                        return sum + amount;
                    }
                    return sum;
                }, 0);

                const totalTradeLimit = parseFloat(existingUser[0].TotalTradeLimit) + newTradeLimit;

                const sqlQuery = `
                UPDATE whiteList
                SET 
                    TotalTradeLimit = ?, 
                    LimitUsed = ?, 
                    LimitRemaining = ?, 
                    Purchases = IF(
                        Purchases = '', 
                        ?, 
                        CONCAT(Purchases, IF(RIGHT(Purchases, 1) = ',', '', ','), ?)
                    )
                WHERE 
                    userAddress REGEXP ? 
                    AND chainId = ?;
            `;

                const queryParams = [
                    totalTradeLimit,
                    totalBorrowAmountUSD,
                    totalTradeLimit - totalBorrowAmountUSD,
                    plan,
                    plan,
                    regex,
                    chainId
                ];

                await queryAsync(sqlQuery, queryParams);

            }
        }));

        res.send({ status: 'success', msg: 'Existing Users Plan Updated Successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: err.message });
    }
});


app.get('/apiv4/removeWhiteListUser', async (req, res) => {
    try {
        const { walletAddress, chainId } = req.query;
        const regex = `^${walletAddress}$`;

        const existingUser = await queryAsync(`
        SELECT * FROM whiteList
        WHERE userAddress REGEXP ? AND chainId = ?
        `, [regex, chainId]);

        if (existingUser.length > 0) {
            const deletedRecord = await queryAsync(`
            DELETE FROM whiteList
            WHERE userAddress REGEXP ? AND chainId = ?
        `, [regex, chainId]);

            if (deletedRecord.affectedRows > 0) {
                return res.json({ status: 'success', msg: 'User deleted from whitelist.' });
            } else {
                return res.status(404).json({ status: 'failed', msg: 'Error Whiteisting transaction.' });
            }
        } else {
            return res.json({ status: 'failed', msg: 'Not a whitelisted User...please try again' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: err.message });
    }
});


app.get('/apiv4/changeWhiteListUserPlan', async (req, res) => {
    try {
        const { walletAddress, plan } = req.query;
        if (!walletAddress || !plan) {
            return res.json({ status: 'failed', msg: 'Credentials Missing' });
        }
        const regex = `^${walletAddress}$`;

        const existingUser = await queryAsync(`
      SELECT * FROM whiteList
      WHERE userAddress REGEXP ?
    `, [regex]);

        if (existingUser.length > 0) {
            const updatedRecord = await queryAsync(`
        UPDATE whiteList
        SET Whitelist_type = ?, status = 'whitelisted'
        WHERE userAddress REGEXP ?
      `, [plan, regex]);

            if (updatedRecord.affectedRows > 0) {
                return res.json({ status: 'success', msg: 'Whitelist type updated for the matching user.' });
            } else {
                return res.json({ status: 'failed', msg: 'No matching user found in whitelist.' });
            }
        } else {
            return res.json({ status: 'failed', msg: 'Not a whitelisted User...please try again' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'failed', msg: 'Error Whiteisting transaction.' });
    }
});


app.get('/apiv4/getWhitelistedUser', async (req, res) => {
    try {
        const { walletAddress, chainId } = req.query;
        if (!walletAddress) {
            return res.json({ status: 'failed', msg: 'Missing user address.' });
        }
        const regex = `^${walletAddress}$`;

        const whitelistedUser = await queryAsync(`
        SELECT * FROM whiteList
        WHERE userAddress REGEXP ?
        `, [regex]);

        if (whitelistedUser.length > 0) {
            return res.json({ status: 'success', data: whitelistedUser[0] });
        } else {
            return res.json({ status: 'failed', msg: 'notwhitelisted' });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: 'failed', msg: err });
    }
});


app.get('/apiv4/getAllWhitelistedUser', async (req, res) => {
    try {
        const { chainId } = req.query;
        const whitelistedUsers = await queryAsync(`SELECT * FROM whiteList WHERE chainId = ?`, [chainId]);

        if (whitelistedUsers.length > 0) {
            return res.json({ status: 'success', data: whitelistedUsers });
        } else {
            return res.json({ status: 'failed', msg: 'Error' });
        }
    } catch (err) {
        console.log(err);
        return res.json({ status: 'failed', msg: 'Error fetching whitelisted user.' });
    }
});

const defaultTimezone = 'UTC';


app.get('/apiv4/getAllProfitTrades', async (req, res) => {
    try {
        const today = moment().tz(defaultTimezone);
        today.startOf('day');

        const query = `
    SELECT COUNT(*) AS totalRecordsCount
    FROM profits
    WHERE IndianTime >= ?
      AND IndianTime < ?;
    `;

        const params = [today.toDate(), moment(today).endOf('day').toDate()];
        const [result] = await queryAsync(query, params);

        const totalRecordsCount = result ? result.totalRecordsCount : 0;

        if (totalRecordsCount >= 15) {
            return res.json({ status: 'failed', msg: 'Error saving transaction. Daily limit reached.', tradeCount: totalRecordsCount });
        } else {
            return res.json({ status: 'success', msg: `there are limit ${totalRecordsCount} done today, tradeCount: totalRecordsCount` });
        }
    } catch (err) {
        return res.json({ status: 'failed', msg: 'Error fetching whitelisted user.' });
    }
});

app.post('/apiv4/saveProfitTrades', async (req, res) => {
    try {
        const userAddress = req.body.userAddress;
        const regex = new RegExp('^' + userAddress + '$', 'i');
        const today = moment().tz(defaultTimezone);
        today.startOf('day');

        const existingUserQuery = `
      SELECT COUNT(*) AS existingUserRecordsCount
      FROM profits
      WHERE userAddress REGEXP ?
        AND IndianTime >= ?
        AND IndianTime < ?;
    `;

        const existingUserParams = [regex.source, today.toISOString(), moment(today).endOf('day').toISOString()];

        const [existingUserResult] = await queryAsync(existingUserQuery, existingUserParams);
        const existingUserRecordsCount = existingUserResult ? existingUserResult.existingUserRecordsCount : 0;

        if (existingUserRecordsCount > 0) {
            return res.json({ status: 'failed', msg: 'User has already recorded a transaction today.' });
        }

        const totalRecordsQuery = `
      SELECT COUNT(*) AS totalRecordsCount
      FROM profits
      WHERE IndianTime >= ?
        AND IndianTime < ?;
    `;

        const totalRecordsParams = [today.toISOString(), moment(today).endOf('day').toISOString()];

        const [totalRecordsResult] = await queryAsync(totalRecordsQuery, totalRecordsParams);
        const totalRecordsCount = totalRecordsResult ? totalRecordsResult.totalRecordsCount : 0;

        if (totalRecordsCount >= 15) {
            return res.json({ status: 'failed', msg: 'Error saving transaction. Daily limit reached.' });
        }

        const amount = req.body.Amount;
        const percentage = req.body.Percentage;

        const saveTransactionQuery = `
      INSERT INTO profits (userAddress, Amount, Percentage, IndianTime)
      VALUES (?, ?, ?, ?);
    `;

        const saveTransactionParams = [userAddress, amount, percentage, today.format()];

        const saveTransactionResult = await queryAsync(saveTransactionQuery, saveTransactionParams);

        if (saveTransactionResult && saveTransactionResult.affectedRows > 0) {
            return res.json({ status: 'success', msg: 'Saved successfully' });
        } else {
            return res.json({ status: 'failed', msg: 'Error saving transaction.' });
        }
    } catch (err) {
        return res.json({ status: 'failed', msg: 'Error fetching whitelisted user.' });
    }
});

app.post('/apiv4/BatchWhitelist', upload.any(), async (req, res) => {
    try {
        const file = req.files[0];
        console.log(file);

        if (!file) {
            return res.status(400).send({ status: 'error', message: 'No file uploaded' });
        }

        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return res.status(400).send({ status: 'error', message: 'No sheets found in the Excel file' });
        }
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            return res.status(400).send({ status: 'error', message: `Sheet '${sheetName}' not found in the Excel file` });
        }
        const data = xlsx.utils.sheet_to_json(sheet, { raw: false });
        console.log('Sheet Names:', workbook.SheetNames);
        console.log('Sheet Data:', sheet);
        console.log(data);
        res.status(200).send({ status: 'success', message: 'File uploaded and processed successfully', data: data });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: 'error', message: 'Internal Server Error' });
    }
});

app.get('/apiv4/getCheckTrades', async (req, res) => {
    const regex = new RegExp('^' + req.query.walletAddress + '$', 'i');
    let userArray = []
    const whitelistMOdel = await whiteListModel.findOne({ userAddress: { $regex: regex } })
    const userTransactions = await transactionModel.find({ userAddress: { $regex: regex }, trxHash: { $exists: true, $ne: "" } });
    for (const transaction of userTransactions) {
        if (!transaction.borrowAmountUSD) {
            const newBorrowAmount = await calculateBorrowAmount(transaction);
            transaction.borrowAmountUSD = newBorrowAmount;
            await transaction.save();
        }
    }
    const totalBorrowAmountUSD = userTransactions.reduce((sum, transaction) => {
        const amount = parseFloat(transaction.borrowAmountUSD);
        if (!isNaN(amount)) {
            return sum + amount;
        }
        return sum;
    }, 0);
    const totalProfitAmountUSD = userTransactions.reduce((sum, transaction) => {
        const amount = parseFloat(transaction.profitUSD);
        if (!isNaN(amount)) {
            return sum + amount;
        }
        return sum;
    }, 0);

    const totalTradeLimit = whitelistMOdel.TotalTradeLimit;
    const limitLeft = totalTradeLimit - totalBorrowAmountUSD

    userArray.push({
        totalTradeLimit: totalTradeLimit,
        totalBorrowAmountUSD: totalBorrowAmountUSD,
        totalProfit: totalProfitAmountUSD,
        limitLeft: limitLeft,
        totalTrades: userTransactions.length
    })
    res.send({ status: 'success', data: userArray })
})

// app.get('/apiv4/getPairs', async (req, res) => {
//     const pairs = await generate()
//     res.send({ data: pairs })
// })

async function calculateBorrowAmount(trans) {
    const from_symbol = trans.pair1;
    let Token;
    if (from_symbol == 'USDC.e') {
        Token = 'USDC'
    }
    else if (from_symbol == 'WBTC') {
        Token = 'BTC'
    }
    else if (from_symbol == 'WMATIC') {
        Token = 'MATIC'
    }
    else if (from_symbol == 'WETH') {
        Token = 'ETH'
    }
    else if (from_symbol == 'stMATIC') {
        Token = 'MATIC'
    }
    else {
        Token = from_symbol;
    }
    const Pricedata = await axios.get(`https://min-api.cryptocompare.com/data/price?api_key=afb9c2ae7b1584cd4fdf5185d22982633f6ac3d5f3cdf109debfe8e307d2b940&fsym=${Token}&tsyms=USD`);
    //(Pricedata,'pricedata');
    if (Pricedata.data.USD) {
        const checkPrice = Pricedata ? Pricedata.data.USD : 0;
        return checkPrice * trans.borrowAmount;
    }
}

async function generate() {

    const pairs1 = [
        ["USDT-WETH"],
        ["WMATIC-LDO"],
        ["DAI-USDC.e"],
        ["WMATIC-RNDR"],
        ["WMATIC-CRV"],
        ["USDT-USDC.e"],
        ["WMATIC-SAND"],
        ["LINK-WMATIC"],
        ["USDC.e-LINK"],
        ["USDC.e-WETH"],
        ["USDC.e-FRAX"],
        ["USDT-WMATIC"],
        ["LINK-USDC.e"],
        ["WETH-SNX"],
        ["WETH-FYN"],
        ["WMATIC-NAKA"],
        ["WMATIC-MAKERX"],
        ["AAVE-UNI"],
        ["WETH-ICHI"],
        ["WETH-LDO"],
        ["LINK-WETH"],
        ["WMATIC-AAVE"],
        ["WMATIC-USDC.e"],
        ["WMATIC-USDT"],
        ["AAVE-USDC.e"],
        ["USDT-TRADE"],
        ["USDC.e-DAI"],
        ["USDC.e-USDT"],
        ["AAVE-WETH"],
        ["WETH-USDC.e"],
        ["USDT-DAI"],
        ["USDT-WMATIC"],
        ["USDC.e-W$C"],
        ["LINK-USDT"],
        ["DAI-USDT"]
    ];

    const MaxPercentage = [
        1.3, 1, 1.2, 1.2, 1.1, 1.2, 1.3, 1.11, 1.2,
        1.2, 1.1, 1.04, 1.2, 1.105, 1.23, 1.19, 1.04,
        1.26, 1.05, 1.23, 1.23, 1.1, 1.3, 1.19, 1.1, 1,
        1.23, 1.19, 0.9, 1, 1.03, 1.24, 1.29, 1, 1.11
    ];

    const MinPercentage = [
        0.52, 0.3, 0.2001, 0.68, 0.09, 0.06, 0.17, 0.68, 0.4, 0.25,
        0.2099, 0.8048, 0.3933, 0.3946, 0.2434, 0.0113, 0.2823, 0.3571, 0.3575, 0.4593,
        0.428, 0.25, 0.1261, 0.4965, 0.2055, 0.3804, 0.1, 0.1189, 0.2408,
        0.6066, 0.06, 0.1145, 0.206, 0.1863, 0.507
    ];

    const getRandomIndexes = (array, count, excludedIndexes = []) => {
        const indexes = [];
        while (indexes.length < count) {
            const randomIndex = Math.floor(Math.random() * array.length);
            if (!indexes.includes(randomIndex) && !excludedIndexes.includes(randomIndex)) {
                indexes.push(randomIndex);
            }
        }
        return indexes;
    };

    const generateRandomPercentage = (min, max) => {
        return (Math.random() * (max - min) + min).toFixed(4);
    };

    const resultObject = {};
    const usedIndexes = [];

    const randomIndexes = getRandomIndexes(MaxPercentage, 12);

    randomIndexes.forEach((index, number) => {
        const pair = pairs1[index][0];
        const minPercentage = MinPercentage[index];
        const maxPercentage = MaxPercentage[index];
        const randomPercentage = generateRandomPercentage(minPercentage, maxPercentage);

        resultObject[number] = {
            pair,
            percentage: randomPercentage
        };

        usedIndexes.push(index);
    });

    return resultObject;


}

app.post('/apiv4/deleteData', (req, res) => {
    const user = req.body.walletAddress;
    connection.query('DELETE FROM pairs WHERE userAddress = ?', [user], (err) => {
        if (err) {
            console.error(`Error deleting pairs for user ${user}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: `Pairs for user ${user} deleted successfully` });
        }
    });
});

app.post('/apiv4/generateAIPairs', async (req, res) => {
    const { data } = req.body
    console.log(data)

    let pairs;
    let network;

    if (data.Network === 'Polygon') {
        pairs = JSON.parse(polygon_pairs);
        network = 137
    } else {
        pairs = JSON.parse(arbitrum_pairs);
        network = 42161
    }

    const filterValue = data.symbol;
    const filteredPairs = pairs.filter(pair => pair.from === filterValue);
    console.log(filteredPairs.length);
    const length = filteredPairs.length

    console.log(network)
    const token = {
        "symbol": data.symbol,
        "decimals": data.decimals,
        "address": data.address
    }
    connection.query('SELECT COUNT(*) AS count FROM pairs WHERE userAddress = ?',
        [data.walletAddress], (error, results) => {
            if (error) {
                console.error('Error checking existence:', error);
                return;
            }
            const recordExists = results[0].count > 0;
            if (recordExists) {
                connection.query('UPDATE pairs SET from_token = ?, from_amount = ?, length = ?, pairs = null WHERE userAddress = ?',
                    [data.symbol, data.amount, length, data.walletAddress], (updateError) => {
                        if (updateError) {
                            console.error('Error updating record:', updateError);
                        } else {
                            console.log('Record updated successfully!');
                        }
                    }
                );
            } else {
                connection.query('INSERT INTO pairs (userAddress, from_token, from_amount, length) VALUES (?, ?, ?, ?)',
                    [data.walletAddress, data.symbol, data.amount, length], (insertError) => {
                        if (insertError) {
                            console.error('Error inserting record:', insertError);
                        } else {
                            console.log('Record inserted successfully!');
                        }
                    }
                );
            }
        });

    let amount = data.amount
    let num = 1;
    for (const pair of filteredPairs) {
        try {

            const from = pair.from;
            const to = pair.to;
            const from_token_address = pair.from_contract;
            const to_token_address = pair.to_contract;
            const from_token_decimal = pair.from_decimal;
            const to_token_decimal = pair.to_decimal;

            /*           
            const from = pair.to;
            const to = token.symbol;
            const from_token_address = pair.to_contract;
            const to_token_address = token.address
            const from_token_decimal = pair.to_decimal;
            const to_token_decimal = token.decimals;
            */

            console.log("From:", from);
            console.log("To:", to);
            console.log("From Token Address:", from_token_address);
            console.log("To Token Address:", to_token_address);
            console.log("From Token Decimal:", from_token_decimal);
            console.log("To Token Decimal:", to_token_decimal);

            /*
             const from = 'USDT';
             const to = 'USDC';
             const from_token_address = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
             const to_token_address = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
             const from_token_decimal = 6
             const to_token_decimal = 6
             */
            const from_amount = new BigNumber(parseFloat(amount) * 10 ** from_token_decimal).toFixed();
            const to_amount = new BigNumber(parseFloat(amount) * 10 ** to_token_decimal).toFixed();
            const Buyconfig = {
                headers: {
                    "Authorization": "Bearer n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
                },
                params: {
                    "src": from_token_address,
                    "dst": to_token_address,
                    "amount": from_amount
                }
            };

            const openocean_config = {
                headers: {
                    'Authorization': `Qdc1YAmzA6ZtzASUoXZQuULntrmP7UvI`
                }
            };
            const paraswap_config = {
                headers: {
                    'Authorization': `Bearer fs1juF5UZP6RlMh4fFrnb8AiWmg4sqXq7MuKFKq9`
                }
            }

            const zerox_config = {
                headers: {
                    '0x-api-key': '4462a548-dfd7-4dbb-9af6-632f6f15fb38'
                }
            };

            const paraSwapBuyUrl = `https://api.paraswap.io/prices/?srcToken=${from_token_address}&destToken=${to_token_address}&amount=${from_amount}&srcDecimals=${from_token_decimal}&destDecimals=${to_token_decimal}&side=SELL&excludeDirectContractMethods=false&network=${networkID}&otherExchangePrices=true&partner=paraswap.io&userAddress=0x0000000000000000000000000000000000000000`;
            const oneInchUrl = `https://api.1inch.dev/swap/v5.2/${networkID}/quote`;
            const openOceanBuyUrl = `https://ethapi.openocean.finance/v2/${networkID}/quote?inTokenSymbol=${from}&inTokenAddress=${from_token_address}&outTokenSymbol=${to}&outTokenAddress=${to_token_address}&amount=${from_amount}&gasPrice=37566761232&slippage=100&referrer=0x3487ef9f9b36547e43268b8f0e2349a226c70b53&disabledDexIds=`;
            const zeroxUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${from_token_address}&buyToken=${to_token_address}&sellAmount=${from_amount}`;
            await new Promise(resolve => setTimeout(resolve, 2000));
            const [paraSwapBuyResponse, oneInchBuyResponse, openOceanBuyResponse, ZeroxBuyResponse] = await Promise.all([
                axios.get(paraSwapBuyUrl, paraswap_config),
                axios.get(oneInchUrl, Buyconfig),
                axios.get(openOceanBuyUrl, openocean_config),
                axios.get(zeroxUrl, zerox_config)
            ]);
            const zerox_orders = ZeroxBuyResponse.data.orders;
            const zerox_exchanges = [];
            zerox_orders.forEach((value) => {
                zerox_exchanges.push(value.source);
            });
            const paraswap_token_price = paraSwapBuyResponse.data.priceRoute.destAmount / to_amount;
            const paraswap_one_usd_price = (1 / paraswap_token_price).toFixed(to_token_decimal);
            const paraswap_one_usd_to_amount = new BigNumber(parseFloat(paraswap_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const openocean_token_price = openOceanBuyResponse.data.outAmount / to_amount;
            const openocean_one_usd_price = (1 / openocean_token_price).toFixed(to_token_decimal);
            const openocean_one_usd_to_amount = new BigNumber(parseFloat(openocean_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const oneinch_token_price = oneInchBuyResponse.data.toAmount / to_amount;
            const oneinch_one_usd_price = (1 / oneinch_token_price).toFixed(to_token_decimal);
            const oneinch_one_usd_to_amount = new BigNumber(parseFloat(oneinch_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const zerox_token_price = ZeroxBuyResponse.data.grossPrice / to_amount;
            const zerox_one_usd_price = (1 / zerox_token_price).toFixed(to_token_decimal);
            const zerox_one_usd_to_amount = new BigNumber(parseFloat(zerox_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const Buyprices = {
                ParaSwap: paraswap_one_usd_price,
                OneInch: oneinch_one_usd_price,
                OpenOcean: openocean_one_usd_price,
                Zerox: zerox_one_usd_price
            };

            // console.log(Buyprices)
            const paraSwapSellUrl = `https://api.paraswap.io/prices/?srcToken=${to_token_address}&destToken=${from_token_address}&amount=${paraswap_one_usd_to_amount}&srcDecimals=${to_token_decimal}&destDecimals=${from_token_decimal}&side=BUY&excludeDirectContractMethods=false&network=${networkID}&otherExchangePrices=true&partner=paraswap.io&userAddress=0x0000000000000000000000000000000000000000`;
            const openOceanSellUrl = `https://ethapi.openocean.finance/v2/${networkID}/quote?inTokenSymbol=${from}&inTokenAddress=${from_token_address}&outTokenSymbol=${to}&outTokenAddress=${to_token_address}&amount=${openocean_one_usd_to_amount}&gasPrice=37566761232&slippage=100&referrer=0x3487ef9f9b36547e43268b8f0e2349a226c70b53&disabledDexIds=`;
            const zeroxSellUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${to_token_address}&buyToken=${from_token_address}&sellAmount=${zerox_one_usd_to_amount}`;
            const Sellconfig = {
                headers: {
                    "Authorization": "Bearer n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
                },
                params: {
                    "src": to_token_address,
                    "dst": from_token_address,
                    "amount": oneinch_one_usd_to_amount
                }
            };

            //await new Promise(resolve => setTimeout(resolve, 2000));
            const [paraSwapSellResponse, oneInchSellResponse, openOceanSellResponse, zeroxSellResponse] = await Promise.all([
                axios.get(paraSwapSellUrl, paraswap_config),
                axios.get(oneInchUrl, Sellconfig),
                axios.get(openOceanSellUrl, openocean_config),
                axios.get(zeroxSellUrl, zerox_config)
            ]);
            const zerox_sell_orders = zeroxSellResponse.data.orders;
            const zerox_sell_exchanges = [];
            zerox_sell_orders.forEach((value) => {
                zerox_sell_exchanges.push(value.source);
            });
            const Sellprices = {
                ParaSwap: paraSwapSellResponse.data.priceRoute.destAmount / to_amount,
                OneInch: oneInchSellResponse.data.toAmount / to_amount,
                OpenOcean: openOceanSellResponse.data.outAmount / to_amount,
                Zerox: zeroxSellResponse.grossPrice / to_amount,
            };

            //console.log(Sellprices)

            let bestBuyPrice = Infinity;
            let bestBuyProvider = '';

            for (const [provider, price] of Object.entries(Buyprices)) {
                if (price < bestBuyPrice) {
                    bestBuyPrice = price;
                    bestBuyProvider = provider;
                }
            }
            let bestSellPrice = Infinity;
            let bestSellProvider = '';

            for (const [provider, price] of Object.entries(Sellprices)) {
                if (price < bestSellPrice) {
                    bestSellPrice = price;
                    bestSellProvider = provider;
                }
            }

            const difference = 1 - bestSellPrice.toFixed(4);
            console.log(difference)
            const percentageChange = (Math.abs((difference - 1) / 1) * 100) - 100;
            // console.log(`Best Buy price: 1 ${to} = ${bestBuyPrice} ${from} (via ${bestBuyProvider})`);
            // console.log(`Best Sell price: ${bestBuyPrice} ${from} = ${bestSellPrice.toFixed(4)} ${to} (via ${bestSellProvider})`);
            // console.log(`Profit Gain: ${percentageChange.toFixed(2)} %`);
            const filter = { from_symbols: from, to_symbol: to };
            const update = { from_dex: bestBuyProvider, to_dex: bestSellProvider, buy_price: bestBuyPrice, sell_price: bestSellPrice.toFixed(4) };
            const options = { upsert: true, new: true, setDefaultsOnInsert: true };

            let res = { from_symbols: from, to_symbol: to, from_dex: bestBuyProvider, to_dex: bestSellProvider, buy_price: bestBuyPrice, sell_price: bestSellPrice.toFixed(4) }
            if (bestBuyProvider == 'Zerox') {
                console.log(`suggested dex ${JSON.stringify(zerox_exchanges)}`);
            }

            if (bestSellProvider == 'Zerox') {
                console.log(`suggested dex ${JSON.stringify(zerox_sell_exchanges)}`);
            }

            if (percentageChange) {
                connection.query('SELECT pairs FROM pairs WHERE userAddress = ?', [data.walletAddress], (selectError, results) => {
                    if (selectError) {
                        console.error('Error fetching existing data:', selectError);
                    } else {
                        try {
                            //console.log('Results:', results[0].pairs);

                            // Parse existing data or initialize as an empty object
                            //let existingPairs = results.length > 0 ? JSON.parse(results[0].pairs) : {};

                            // Merge existing data with new data
                            const existingPairs = JSON.parse(results[0].pairs);
                            // console.log('Existing Pairs:', existingPairs);
                            // console.log('New Data:', res);

                            let mergedPairs;

                            if (existingPairs === null) {
                                mergedPairs = [res];
                            } else {
                                mergedPairs = [...existingPairs, res];
                            }

                            //console.log('Merged Pairs:', mergedPairs);
                            // Update the database with the merged data
                            const updateQuery = 'UPDATE pairs SET pairs = ? WHERE userAddress = ?';
                            const updateParams = [JSON.stringify(mergedPairs), data.walletAddress];
                            // console.log('UPDATE Query:', updateQuery);
                            // console.log('UPDATE Params:', updateParams);

                            connection.query(updateQuery, updateParams, (updateError) => {
                                if (updateError) {
                                    console.error('Error updating record:', updateError);
                                } else {
                                    console.log('Record updated successfully!');
                                }

                                // Close the database connection
                            });
                        } catch (parseError) {
                            console.error('Error parsing JSON:', parseError);
                        }
                    }
                });


            }

            console.log("Working Correctly without error ", num);


        } catch (error) {

            console.log("Not Working Correctly coming error ", num);

            //console.log(error.response);
        }
        num++
    }
})

app.get('/apiv4/getAIPairs', async (req, res) => {
    try {
        const walletAddress = req.query.walletAddress;
        console.log(walletAddress)
        connection.query('SELECT pairs,EnteredAmount FROM pairs WHERE userAddress = ?',
            [walletAddress], (error, results) => {
                if (error) {
                    console.error('Error checking existence:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                // Check if results[0] exists and has 'pairs' property
                if (results[0] && results[0].hasOwnProperty('pairs')) {
                    //console.log(results[0])
                    const pairsData = JSON.parse(results[0].pairs);
                    return res.status(200).json({ pairs: pairsData, amount: results[0].EnteredAmount });
                } else {
                    return res.status(404).json({ error: 'Pairs not found for the given walletAddress' });
                }
            });
    } catch (error) {
        console.log(error)
    }

});


app.get('/apiv4/generateAIPairs2', async (req, res) => {
    // const filterValue = data.symbol;
    // const filteredPairs = pairs.filter(pair => pair.from === filterValue);
    // console.log(filteredPairs.length);
    // const length = filteredPairs.length
    let networkID = 137;

    const filteredPairs = [{
        "pair": "WMATIC/USDC.e",
        "from": "WMATIC",
        "to": "USDC.e",
        "from_contract": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "to_contract": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "from_decimal": 18,
        "to_decimal": 6
    }]

    let amount = 10
    let num = 1;
    for (const pair of filteredPairs) {
        try {

            const from = pair.from;
            const to = pair.to;
            const from_token_address = pair.from_contract;
            const to_token_address = pair.to_contract;
            const from_token_decimal = pair.from_decimal;
            const to_token_decimal = pair.to_decimal;

            console.log("From:", from);
            console.log("To:", to);
            console.log("From Token Address:", from_token_address);
            console.log("To Token Address:", to_token_address);
            console.log("From Token Decimal:", from_token_decimal);
            console.log("To Token Decimal:", to_token_decimal);


            const from_amount = new BigNumber(parseFloat(amount) * 10 ** from_token_decimal).toFixed();
            const to_amount = new BigNumber(parseFloat(amount) * 10 ** to_token_decimal).toFixed();
            const Buyconfig = {
                headers: {
                    "Authorization": "Bearer n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
                },
                params: {
                    "src": from_token_address,
                    "dst": to_token_address,
                    "amount": from_amount
                }
            };

            const openocean_config = {
                headers: {
                    'Authorization': `Qdc1YAmzA6ZtzASUoXZQuULntrmP7UvI`
                }
            };
            const paraswap_config = {
                headers: {
                    'Authorization': `Bearer fs1juF5UZP6RlMh4fFrnb8AiWmg4sqXq7MuKFKq9`
                }
            }

            const zerox_config = {
                headers: {
                    '0x-api-key': '4462a548-dfd7-4dbb-9af6-632f6f15fb38'
                }
            };

            const paraSwapBuyUrl = `https://api.paraswap.io/prices/?srcToken=${from_token_address}&destToken=${to_token_address}&amount=${from_amount}&srcDecimals=${from_token_decimal}&destDecimals=${to_token_decimal}&side=SELL&excludeDirectContractMethods=false&network=${networkID}&otherExchangePrices=true&partner=paraswap.io&userAddress=0x0000000000000000000000000000000000000000`;
            const oneInchUrl = `https://api.1inch.dev/swap/v5.2/${networkID}/quote`;
            const openOceanBuyUrl = `https://ethapi.openocean.finance/v2/${networkID}/quote?inTokenSymbol=${from}&inTokenAddress=${from_token_address}&outTokenSymbol=${to}&outTokenAddress=${to_token_address}&amount=${from_amount}&gasPrice=37566761232&slippage=100&referrer=0x3487ef9f9b36547e43268b8f0e2349a226c70b53&disabledDexIds=`;
            const zeroxUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${from_token_address}&buyToken=${to_token_address}&sellAmount=${from_amount}`;

            await new Promise(resolve => setTimeout(resolve, 2000));

            const [paraSwapBuyResponse, oneInchBuyResponse, openOceanBuyResponse, ZeroxBuyResponse] = await Promise.all([
                axios.get(paraSwapBuyUrl, paraswap_config),
                axios.get(oneInchUrl, Buyconfig),
                axios.get(openOceanBuyUrl, openocean_config),
                axios.get(zeroxUrl, zerox_config)
            ]);

            // console.log("paraSwapBuyResponse",paraSwapBuyResponse.data)
            // console.log("oneInchBuyResponse",oneInchBuyResponse.data)
            // console.log("openOceanBuyResponse",openOceanBuyResponse.data)
            // console.log("ZeroxBuyResponse",ZeroxBuyResponse.data)

            const zerox_orders = ZeroxBuyResponse.data.orders;
            const zerox_exchanges = [];
            zerox_orders.forEach((value) => {
                zerox_exchanges.push(value.source);
            });
            const paraswap_token_price = paraSwapBuyResponse.data.priceRoute.destAmount / to_amount;
            const paraswap_one_usd_price = (1 / paraswap_token_price).toFixed(to_token_decimal);
            const paraswap_one_usd_to_amount = new BigNumber(parseFloat(paraswap_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const openocean_token_price = openOceanBuyResponse.data.outAmount / to_amount;
            const openocean_one_usd_price = (1 / openocean_token_price).toFixed(to_token_decimal);
            const openocean_one_usd_to_amount = new BigNumber(parseFloat(openocean_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const oneinch_token_price = oneInchBuyResponse.data.toAmount / to_amount;
            const oneinch_one_usd_price = (1 / oneinch_token_price).toFixed(to_token_decimal);
            const oneinch_one_usd_to_amount = new BigNumber(parseFloat(oneinch_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const zerox_token_price = ZeroxBuyResponse.data.grossBuyAmount / to_amount;
            const zerox_one_usd_price = (1 / zerox_token_price).toFixed(to_token_decimal);
            const zerox_one_usd_to_amount = new BigNumber(parseFloat(zerox_one_usd_price) * 10 ** from_token_decimal).toFixed();

            const Buyprices = {
                ParaSwap: paraswap_one_usd_price,
                OneInch: oneinch_one_usd_price,
                OpenOcean: openocean_one_usd_price,
                Zerox: zerox_one_usd_price
            };

            console.log(Buyprices)
            const paraSwapSellUrl = `https://api.paraswap.io/prices/?srcToken=${to_token_address}&destToken=${from_token_address}&amount=${paraswap_one_usd_to_amount}&srcDecimals=${to_token_decimal}&destDecimals=${from_token_decimal}&side=BUY&excludeDirectContractMethods=false&network=${networkID}&otherExchangePrices=true&partner=paraswap.io&userAddress=0x0000000000000000000000000000000000000000`;
            const openOceanSellUrl = `https://ethapi.openocean.finance/v2/${networkID}/quote?inTokenSymbol=${to}&inTokenAddress=${to_token_address}&outTokenSymbol=${from}&outTokenAddress=${from_token_address}&amount=${openocean_one_usd_to_amount}&gasPrice=37566761232&slippage=100&referrer=0x3487ef9f9b36547e43268b8f0e2349a226c70b53&disabledDexIds=`;
            const zeroxSellUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${to_token_address}&buyToken=${from_token_address}&sellAmount=${zerox_one_usd_to_amount}`;
            const Sellconfig = {
                headers: {
                    "Authorization": "Bearer n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
                },
                params: {
                    "src": to_token_address,
                    "dst": from_token_address,
                    "amount": oneinch_one_usd_to_amount
                }
            };

            //await new Promise(resolve => setTimeout(resolve, 2000));
            const [paraSwapSellResponse, oneInchSellResponse, openOceanSellResponse, zeroxSellResponse] = await Promise.all([
                axios.get(paraSwapSellUrl, paraswap_config),
                axios.get(oneInchUrl, Sellconfig),
                axios.get(openOceanSellUrl, openocean_config),
                axios.get(zeroxSellUrl, zerox_config)
            ]);

            console.log("paraSwapSellResponse", paraSwapSellResponse.data)
            console.log("oneInchSellResponse", oneInchSellResponse)
            console.log("openOceanSellResponse", openOceanSellResponse.data)
            console.log("zeroxSellResponse", zeroxSellResponse.data)

            const zerox_sell_orders = zeroxSellResponse.data.orders;
            const zerox_sell_exchanges = [];
            zerox_sell_orders.forEach((value) => {
                zerox_sell_exchanges.push(value.source);
            });
            const Sellprices = {
                ParaSwap: paraSwapSellResponse.data.priceRoute.destAmount / to_amount,
                OneInch: oneInchSellResponse.data.toAmount / to_amount,
                OpenOcean: openOceanSellResponse.data.outAmount / to_amount,
                Zerox: zeroxSellResponse.grossPrice / to_amount,
            };

            console.log(Sellprices)

            let bestBuyPrice = Infinity;
            let bestBuyProvider = '';

            for (const [provider, price] of Object.entries(Buyprices)) {
                if (price < bestBuyPrice) {
                    bestBuyPrice = price;
                    bestBuyProvider = provider;
                }
            }
            let bestSellPrice = Infinity;
            let bestSellProvider = '';

            for (const [provider, price] of Object.entries(Sellprices)) {
                if (price < bestSellPrice) {
                    bestSellPrice = price;
                    bestSellProvider = provider;
                }
            }

            const difference = 1 - bestSellPrice.toFixed(4);
            console.log(difference)
            const percentageChange = (Math.abs((difference - 1) / 1) * 100) - 100;
            // console.log(`Best Buy price: 1 ${to} = ${bestBuyPrice} ${from} (via ${bestBuyProvider})`);
            // console.log(`Best Sell price: ${bestBuyPrice} ${from} = ${bestSellPrice.toFixed(4)} ${to} (via ${bestSellProvider})`);
            // console.log(`Profit Gain: ${percentageChange.toFixed(2)} %`);
            const filter = { from_symbols: from, to_symbol: to };
            const update = { from_dex: bestBuyProvider, to_dex: bestSellProvider, buy_price: bestBuyPrice, sell_price: bestSellPrice.toFixed(4) };
            const options = { upsert: true, new: true, setDefaultsOnInsert: true };

            let res = { from_symbols: from, to_symbol: to, from_dex: bestBuyProvider, to_dex: bestSellProvider, buy_price: bestBuyPrice, sell_price: bestSellPrice.toFixed(4) }
            if (bestBuyProvider == 'Zerox') {
                console.log(`suggested dex ${JSON.stringify(zerox_exchanges)}`);
            }

            if (bestSellProvider == 'Zerox') {
                console.log(`suggested dex ${JSON.stringify(zerox_sell_exchanges)}`);
            }

            console.log("Working Correctly without error ", num);

        } catch (error) {

            console.log("Not Working Correctly coming error ", num);

            console.log(error.response);
        }
        num++
    }
})

//-----reset pairs--

app.post('/apiv4/resetPairs', async (req, res) => {

    const walletAddress = req.query.walletAddress;
    try {

        await connection.query('UPDATE pairs SET pairs = null  where userAddress=?  ', [walletAddress]);

        //    stopProcess= true

        console.log("reset pairs in the address", walletAddress)
        res.sendStatus(200);
    } catch (error) {
        console.error('Error resetting pairs:', error);
        res.sendStatus(500);
    }
})


app.get('/apiv4/lastTenTransactions', (req, res) => {
    const query = `
      SELECT pair1,pair2,profitPercentage
      FROM transactions
      WHERE status = 'success'
      ORDER BY id DESC
      LIMIT 10;`;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});








const polygon_pairs = fs.readFileSync('polygon_tokens.json', 'utf8');

const arbitrum_pairs = fs.readFileSync('polygon_tokens.json', 'utf8');

app.post('/apiv4/generateAI', async (req, res) => {
    const { data } = req.body;

    try {
        const amount = data.amount;
        console.log(amount)
        let network;
        let pairs;
        console.log(data.Network)
        if (data.Network === 'Polygon') {
            pairs = JSON.parse(polygon_pairs);
            network = 137
        } else {
            pairs = JSON.parse(arbitrum_pairs);
            network = 42161
        }

        const filterValue = data.symbol;
        const filteredPairs = pairs.filter(pair => pair.from === filterValue);
        console.log(filteredPairs.length);
        //100
        const length = filteredPairs.length;

        connection.query('SELECT COUNT(*) AS count FROM pairs WHERE userAddress = ?',
            [data.walletAddress], (error, results) => {
                if (error) {
                    console.error('Error checking existence:', error);
                    return;
                }
                const recordExists = results[0].count > 0;
                if (recordExists) {
                    connection.query('UPDATE pairs SET from_token = ?, from_amount = ?, length = ?, pairs = null, EnteredAmount = ? WHERE userAddress = ?',
                        [data.symbol, data.amount, length, data.EnterAmount, data.walletAddress], (updateError) => {
                            if (updateError) {
                                console.error('Error updating record:', updateError);
                            } else {
                                console.log('Record updated successfully!');
                            }
                        }
                    );
                } else {
                    connection.query('INSERT INTO pairs (userAddress, from_token, from_amount,EnteredAmount, length) VALUES (?, ?, ?, ?, ?)',
                        [data.walletAddress, data.symbol, data.amount, data.EnterAmount, length], (insertError) => {
                            if (insertError) {
                                console.error('Error inserting record:', insertError);
                            } else {
                                console.log('Record inserted successfully!');
                            }
                        }
                    );
                }
            });

        for (const pair of filteredPairs) {

            const openOceanData = await generateAIopenOcean(pair, amount, network);
            const oneInchData = await generateAIoneInch(pair, amount, network);
            const zeroXData = await generateAIzeroX(pair, amount, network);
            const paraSwapData = await generateAIparaSwap(pair, amount, network);
            console.log(openOceanData, oneInchData, zeroXData, paraSwapData);

            const dataObjects = [openOceanData, oneInchData, zeroXData, paraSwapData];


            const buyResponse = Math.max(openOceanData.buyAmountOpenOcean, oneInchData.buyAmountOneInch, zeroXData.buyAmountZeroX, paraSwapData.buyAmountParaSwap)
            const sellresponse = Math.max(openOceanData.sellAmountOpenOcean, oneInchData.sellAmountOneInch, zeroXData.sellAmountZeroX, paraSwapData.sellAmountParaSwap)
            console.log(buyResponse, sellresponse)

            let bestBuyDex;
            if (Number(buyResponse) === Number(openOceanData.buyAmountOpenOcean)) {
                bestBuyDex = "Open Ocean";
            } else if (Number(buyResponse) === Number(oneInchData.buyAmountOneInch)) {
                bestBuyDex = "One Inch";
            } else if (Number(buyResponse) === Number(zeroXData.buyAmountZeroX)) {
                bestBuyDex = "0x";
            } else {
                bestBuyDex = "Para Swap";
            }

            let bestSellDex;
            if (Number(sellresponse) === Number(openOceanData.sellAmountOpenOcean)) {
                bestSellDex = "Open Ocean"
            } else if (Number(sellresponse) === Number(oneInchData.sellAmountOneInch)) {
                bestSellDex = "One Inch";
            } else if (Number(sellresponse) === Number(zeroXData.sellAmountZeroX)) {
                bestSellDex = "0x";
            } else {
                bestSellDex = "Para Swap";
            }

            console.log(bestBuyDex, bestSellDex)


            let inAmount = parseInt(amount) + parseFloat(amount * (0.05 / 100));
            let checkProfit = parseFloat(sellresponse) - parseFloat(inAmount);
            const minus_plus = checkProfit <= 0 ? -Math.abs(checkProfit) : Math.abs(checkProfit)
            let profitPercent = (minus_plus / amount) * 100;

            console.log(inAmount, checkProfit, minus_plus, profitPercent)



            // const checkProfit = sellresponse - amount;
            // const minus_plus = checkProfit <= 0 ? -Math.abs(checkProfit) : Math.abs(checkProfit);
            // console.log('Profit Amount:', minus_plus);
            // if (minus_plus > 0) {
            //     profitPercent = Math.abs(minus_plus / amount) * 100;
            // } else {
            //     profitPercent = -Math.abs(minus_plus / amount) * 100;
            // }

            console.log('Profit Percentage:', profitPercent.toFixed(2), '%');
            console.log(`DEX with overall highest buy price: ${bestBuyDex}, Amount: ${buyResponse}`);
            console.log(`DEX with overall highest sell price: ${bestSellDex}, Amount: ${sellresponse.toFixed(4)}`);

            // Rename the variable to avoid conflict with the response object
            const result = {
                from_symbols: pair.from,
                to_symbol: pair.to,
                from_dex: bestBuyDex,
                to_dex: bestSellDex,
                buy_price: buyResponse,
                sell_price: sellresponse.toFixed(4),
                Profit_Amount: minus_plus,
                Profit_Percentage: profitPercent.toFixed(2)
            };

            if (profitPercent > 0) {
                connection.query(
                    'SELECT pairs FROM pairs WHERE userAddress = ?',
                    [data.walletAddress],
                    (selectError, results) => {
                        if (selectError) {
                            console.error('Error fetching existing data:', selectError);
                        } else {
                            try {
                                const existingPairs = JSON.parse(results[0].pairs);
                                const mergedPairs = existingPairs === null ? [result] : [...existingPairs, result];

                                connection.query(
                                    'UPDATE pairs SET pairs = ? WHERE userAddress = ?',
                                    [JSON.stringify(mergedPairs), data.walletAddress],
                                    (updateError) => {
                                        if (updateError) {
                                            console.error('Error updating record:', updateError);
                                        } else {
                                            console.log('Record updated successfully!');
                                        }
                                    }
                                );
                            } catch (parseError) {
                                console.error('Error parsing JSON:', parseError);
                            }
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error(error);
    }
});


async function generateAIopenOcean(pair, Amount, network) {
    const networkID = network;
    const amount = Amount;

    try {
        const from = pair.from;
        const to = pair.to;
        const from_token_address = pair.from_contract;
        const to_token_address = pair.to_contract;
        const from_token_decimal = pair.from_decimal;
        const to_token_decimal = pair.to_decimal;

        console.log("From:", from);
        console.log("To:", to);

        console.log(1);

        const from_amount = new BigNumber(parseFloat(amount)).toFixed();

        const openocean_config = {
            headers: {
                "apikey": "Qdc1YAmzA6ZtzASUoXZQuULntrmP7UvI"
            }
        };

        const openOceanBuyUrl = `https://open-api-pro.openocean.finance/v3/${networkID}/swap_quote?inTokenSymbol=${from}&inTokenAddress=${from_token_address}&outTokenSymbol=${to}&outTokenAddress=${to_token_address}&amount=${from_amount}&slippage=5&gasPrice=200&account=0x8d0A2e65a239c49C5Ca58F6ad38BffE450363b65`;
        const openOceanBuyResponse = await axios.get(openOceanBuyUrl, openocean_config);
        const buyAmount = openOceanBuyResponse.data.data.outAmount / 10 ** to_token_decimal;

        if (openOceanBuyResponse && openOceanBuyResponse.data.data.outAmount) {
            const openOceanSellUrl = `https://open-api-pro.openocean.finance/v3/${networkID}/swap_quote?inTokenSymbol=${to}&inTokenAddress=${to_token_address}&outTokenSymbol=${from}&outTokenAddress=${from_token_address}&amount=${buyAmount}&slippage=5&gasPrice=200&account=0x8d0A2e65a239c49C5Ca58F6ad38BffE450363b65`;
            const openOceanSellResponse = await axios.get(openOceanSellUrl, openocean_config);
            if (openOceanSellResponse && openOceanSellResponse.data.data.outAmount) {

                return {
                    Dex: 'Open Ocean',
                    buyAmountOpenOcean: buyAmount,
                    sellAmountOpenOcean: openOceanSellResponse.data.data.outAmount / 10 ** from_token_decimal
                };
            } else {
                return {
                    Dex: 'Open Ocean',
                    buyAmountOpenOcean: buyAmount,
                    sellAmountOpenOcean: 0
                };
            }
        } else {
            return {
                Dex: 'Open Ocean',
                buyAmountOpenOcean: 0,
                sellAmountOpenOcean: 0
            };
        }
    } catch (error) {
        console.log(error)
        return {
            Dex: 'Open Ocean',
            buyAmountOpenOcean: 0,
            sellAmountOpenOcean: 0
        };
    }
}

async function generateAIoneInch(pair, Amount, network) {
    const networkID = network;
    const amount = Amount;

    try {
        const from = pair.from;
        const to = pair.to;
        const from_token_address = pair.from_contract;
        const to_token_address = pair.to_contract;
        const from_token_decimal = pair.from_decimal;
        const to_token_decimal = pair.to_decimal;

        console.log(2);


        const from_amount = new BigNumber(parseFloat(amount) * 10 ** from_token_decimal).toFixed();
        const to_amount = new BigNumber(parseFloat(amount) * 10 ** to_token_decimal).toFixed();

        const Buyconfig = {
            headers: {
                "Authorization": "n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
            },
            params: {
                src: from_token_address,
                dst: to_token_address,
                amount: from_amount,
                slippage: 10,
                from: "0x6423F60CCF38e9D8bb476d01e48Fd17BF4d36481",
                disableEstimate: true,
            }
        };

        const oneInchUrl = `https://api.1inch.dev/swap/v6.0/${networkID}/swap`;
        const oneInchBuyResponse = await axios.get(oneInchUrl, Buyconfig)

        const buyAmount = oneInchBuyResponse.data.dstAmount;

        if (oneInchBuyResponse && oneInchBuyResponse.data.dstAmount) {
            const Sellconfig = {
                headers: {
                    "Authorization": "n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
                },
                params: {
                    src: to_token_address,
                    dst: from_token_address,
                    amount: buyAmount,
                    slippage: 10,
                    from: "0x6423F60CCF38e9D8bb476d01e48Fd17BF4d36481",
                    disableEstimate: true,
                }
            };
            const oneInchSellResponse = await axios.get(oneInchUrl, Sellconfig)
            if (oneInchSellResponse && oneInchSellResponse.data.dstAmount) {
                return {
                    Dex: 'OneInch',
                    buyAmountOneInch: oneInchBuyResponse.data.dstAmount / 10 ** to_token_decimal,
                    sellAmountOneInch: oneInchSellResponse.data.dstAmount / 10 ** from_token_decimal
                };
            } else {
                return {
                    Dex: 'OneInch',
                    buyAmountOneInch: oneInchBuyResponse.data.dstAmount / 10 ** to_token_decimal,
                    sellAmountOneInch: 0
                };
            }
        } else {
            return {
                Dex: 'OneInch',
                buyAmountOneInch: 0,
                sellAmountOneInch: 0
            };
        }

    } catch (error) {
        return {
            Dex: 'OneInch',
            buyAmountOneInch: 0,
            sellAmountOneInch: 0
        };
    }
}

async function generateAIzeroX(pair, Amount, network) {
    const networkID = network;
    const amount = Number(Amount);

    try {
        const from = pair.from;
        const to = pair.to;
        const from_token_address = pair.from_contract;
        const to_token_address = pair.to_contract;
        const from_token_decimal = pair.from_decimal;
        const to_token_decimal = pair.to_decimal;

        console.log(3);

        const from_amount = new BigNumber(parseFloat(amount) * 10 ** from_token_decimal).toFixed();
        let zeroxBuyUrl, zeroxSellUrl;

        const zerox_config = {
            headers: {
                "0x-api-key": "4462a548-dfd7-4dbb-9af6-632f6f15fb38"
            }
        };
        if (networkID === 10) {
            zeroxBuyUrl = `https://optimism.api.0x.org/swap/v1/quote?sellToken=${from_token_address}&buyToken=${to_token_address}&sellAmount=${from_amount}`;
        } else {
            zeroxBuyUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${from_token_address}&buyToken=${to_token_address}&sellAmount=${from_amount}&enableSlippageProtection=true&excludedSources=Uniswap`;
        }

        const ZeroxBuyResponse = await axios.get(zeroxBuyUrl, zerox_config);
        const buyAmount = ZeroxBuyResponse.data.buyAmount;

        if (ZeroxBuyResponse && ZeroxBuyResponse.data.buyAmount) {

            if (networkID === 10) {
                zeroxSellUrl = `https://optimism.api.0x.org/swap/v1/quote?sellToken=${to_token_address}&buyToken=${from_token_address}&sellAmount=${buyAmount}`;
            } else {
                zeroxSellUrl = `https://polygon.api.0x.org/swap/v1/quote?sellToken=${to_token_address}&buyToken=${from_token_address}&sellAmount=${buyAmount}&enableSlippageProtection=true&excludedSources=Uniswap`;
            }

            const zeroxSellResponse = await axios.get(zeroxSellUrl, zerox_config);
            if (zeroxSellResponse && zeroxSellResponse.data.buyAmount) {
                return {
                    Dex: 'ZeroX',
                    buyAmountZeroX: ZeroxBuyResponse.data.buyAmount / 10 ** to_token_decimal,
                    sellAmountZeroX: zeroxSellResponse.data.buyAmount / 10 ** from_token_decimal
                };
            } else {
                return {
                    Dex: 'ZeroX',
                    buyAmountZeroX: ZeroxBuyResponse.data.buyAmount / 10 ** to_token_decimal,
                    sellAmountZeroX: 0
                };
            }
        } else {
            return {
                Dex: 'ZeroX',
                buyAmountZeroX: 0,
                sellAmountZeroX: 0
            };
        }
    } catch (error) {
        return {
            Dex: 'ZeroX',
            buyAmountZeroX: 0,
            sellAmountZeroX: 0
        };
    }
}

async function generateAIparaSwap(pair, Amount, network) {
    const networkID = network;
    const amount = Amount;

    try {
        const from = pair.from;
        const to = pair.to;
        const from_token_address = pair.from_contract;
        const to_token_address = pair.to_contract;
        const from_token_decimal = pair.from_decimal;
        const to_token_decimal = pair.to_decimal;

        console.log(4);


        const from_amount = new BigNumber(parseFloat(amount) * 10 ** from_token_decimal).toFixed();

        let quote = await getSwapTransaction(from_token_address, to_token_address, from_amount, from_token_decimal, to_token_decimal, networkID);

        if (quote.amount) {

            let quote1 = await getSwapTransaction(to_token_address, from_token_address, quote.amount, to_token_decimal, from_token_decimal, networkID);

            if (quote1.amount) {
                return {
                    Dex: 'Para Swap',
                    buyAmountParaSwap: quote.amount / 10 ** to_token_decimal,
                    sellAmountParaSwap: quote1.amount / 10 ** from_token_decimal
                };

            } else {
                return {
                    Dex: 'Para Swap',
                    buyAmountParaSwap: quote.amount / 10 ** to_token_decimal,
                    sellAmountParaSwap: 0
                };
            }
        } else {
            return {
                Dex: 'Para Swap',
                buyAmountParaSwap: 0,
                sellAmountParaSwap: 0
            };
        }
    } catch (error) {
        return {
            Dex: 'Para Swap',
            buyAmountParaSwap: 0,
            sellAmountParaSwap: 0
        };
    }
}


app.post('/apiv4/generateAIfor2dex', async (req, res) => {
    const { data } = req.body;

    // console.log(data);
    try {
        if (!data || !data.amount || !data.networkID || !data.from_token || !data.to_token || !data.from_address || !data.to_address || !data.from_decimal || !data.to_decimal || !data.enteredUSDAmount) {
            return res.status(400).json({ error: 'Invalid request data.' });
        }
        let enteredUSDAmount = data.enteredUSDAmount
        const amount = data.amount;
        const network = data.networkID;
        const pair = {
            from: data.from_token,
            to: data.to_token,
            from_contract: data.from_address,
            to_contract: data.to_address,
            from_decimal: data.from_decimal,
            to_decimal: data.to_decimal,
        };

        // const openOceanData = await generateAIopenOcean(pair, amount, network);
        // const zeroXData = await generateAIzeroX(pair, amount, network);
        // const oneInchData = await generateAIoneInch(pair, amount, network);
        // const paraSwapData = await generateAIparaSwap(pair, amount, network);

        /*
        const [openOceanData, zeroXData, oneInchData, paraSwapData] = await Promise.all([
            generateAIopenOcean(pair, amount, network),
            generateAIzeroX(pair, amount, network),
            generateAIoneInch(pair, amount, network),
            generateAIparaSwap(pair, amount, network)
        ]);
        */

        const [openOceanData] = await Promise.all([
            generateAIopenOcean(pair, amount, network)
        ]);

        let zeroXData = {
            Dex: 'ZeroX',
            buyAmountZeroX: 0,
            sellAmountZeroX: 0
        };
        let oneInchData = {
            Dex: 'OneInch',
            buyAmountOneInch: 0,
            sellAmountOneInch: 0
        };
        let paraSwapData = {
            Dex: 'Para Swap',
            buyAmountParaSwap: 0,
            sellAmountParaSwap: 0
        };

        // console.log(openOceanData, zeroXData, oneInchData, paraSwapData);

        const buyResponse = Math.max(openOceanData.buyAmountOpenOcean, oneInchData.buyAmountOneInch, zeroXData.buyAmountZeroX, paraSwapData.buyAmountParaSwap);
        const sellResponse = Math.max(openOceanData.sellAmountOpenOcean, oneInchData.sellAmountOneInch, zeroXData.sellAmountZeroX, paraSwapData.sellAmountParaSwap);
        // console.log(buyResponse, sellResponse);

        let bestBuyDex;
        if (buyResponse === openOceanData.buyAmountOpenOcean) {
            bestBuyDex = "Open Ocean";
        } else if (buyResponse === zeroXData.buyAmountZeroX) {
            bestBuyDex = "0x";
        } else if (buyResponse === oneInchData.buyAmountOneInch) {
            bestBuyDex = "One Inch";
        } else {
            bestBuyDex = "Para Swap";
        }

        let bestSellDex;
        if (sellResponse === openOceanData.sellAmountOpenOcean) {
            bestSellDex = "Open Ocean";
        } else if (sellResponse === zeroXData.sellAmountZeroX) {
            bestSellDex = "0x";
        } else if (sellResponse === oneInchData.sellAmountOneInch) {
            bestSellDex = "One Inch";
        } else {
            bestSellDex = "Para Swap";
        }

        let bestBuyDexId;
        let bestSellDexId;

        if (bestBuyDex === "Open Ocean") {
            bestBuyDexId = 2;
        } else if (bestBuyDex === "0x") {
            bestBuyDexId = 0;
        } else if (bestBuyDex === "One Inch") {
            bestBuyDexId = 1;
        } else {
            bestBuyDexId = 3;
        }

        if (bestSellDex === "Open Ocean") {
            bestSellDexId = 2;
        } else if (bestSellDex === "0x") {
            bestSellDexId = 0;
        } else if (bestSellDex === "One Inch") {
            bestSellDexId = 1;
        } else {
            bestSellDexId = 3;
        }

        let firstBestBuyDex;
        let firstBestSellDex;
        let secondBestBuyDex;
        let secondBestSellDex;

        let firstBestBuyAmount;
        let firstBestSellAmount;
        let secondBestBuyAmount;
        let secondBestSellAmount;

        let buyDexes = [
            { dex: "Open Ocean", amount: openOceanData.buyAmountOpenOcean },
            { dex: "0x", amount: zeroXData.buyAmountZeroX },
            { dex: "One Inch", amount: oneInchData.buyAmountOneInch },
            { dex: "Para Swap", amount: paraSwapData.buyAmountParaSwap }
        ].sort((a, b) => b.amount - a.amount);

        firstBestBuyDex = buyDexes[0].dex;
        secondBestBuyDex = buyDexes[1].dex;
        firstBestBuyAmount = buyDexes[0].amount.toFixed(4);
        secondBestBuyAmount = buyDexes[1].amount.toFixed(4);

        let sellDexes = [
            { dex: "Open Ocean", amount: openOceanData.sellAmountOpenOcean },
            { dex: "0x", amount: zeroXData.sellAmountZeroX },
            { dex: "One Inch", amount: oneInchData.sellAmountOneInch },
            { dex: "Para Swap", amount: paraSwapData.sellAmountParaSwap }
        ].sort((a, b) => b.amount - a.amount);

        firstBestSellDex = sellDexes[0].dex;
        secondBestSellDex = sellDexes[1].dex;
        firstBestSellAmount = sellDexes[0].amount.toFixed(4);
        secondBestSellAmount = sellDexes[1].amount.toFixed(4);
        let profitPercent;
        let profitAmount;

        console.log(enteredUSDAmount)

        let inAmount = Number(amount) + Number(amount * (0.05 / 100));
        let checkProfit = parseFloat(sellResponse) - parseFloat(inAmount);

        if (enteredUSDAmount > 100) {
            profitAmount = -Math.abs(checkProfit);
        } else {
            profitAmount = checkProfit;
        }

        profitPercent = (profitAmount / amount) * 100;

        console.log(amount, amount * (0.05 / 100));
        console.log(inAmount, checkProfit, profitAmount, profitPercent);


        const result = {
            from_symbols: pair.from,
            to_symbol: pair.to,
            from_dex: bestBuyDexId,
            to_dex: bestSellDexId,

            profit_amount: profitAmount.toFixed(6),
            profit_percentage: profitPercent.toFixed(3),

            firstBestBuyDex: firstBestBuyDex,
            firstBestSellDex: firstBestSellDex,
            secondBestBuyDex: secondBestBuyDex,
            secondBestSellDex: secondBestSellDex,

            firstBestBuyAmount: firstBestBuyAmount,
            firstBestSellAmount: firstBestSellAmount,
            secondBestBuyAmount: secondBestBuyAmount,
            secondBestSellAmount: secondBestSellAmount
        };

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/apiv4/getData', async (req, res) => {

    const { tokenIn, tokenOut, amount, from_decimal, to_decimal, dex, networkID } = req.body;
    console.log(req.body)
    try {
        let buyPrice;
        let sellPrice;
        let amountIn = new BigNumber(parseFloat(amount) * 10 ** from_decimal).toFixed();

        if (dex[0] === 0) {
            console.log("Buying in 0x");
            buyPrice = await getswapData(tokenIn, tokenOut, amountIn, networkID);
        } else if (dex[0] === 1) {
            console.log("Buying in One Inch");
            buyPrice = await getSwapInchTransaction(tokenIn, tokenOut, amountIn, networkID);
        } else if (dex[0] === 2) {
            console.log("Buying in Open Ocean");
            buyPrice = await getOpenoceanSwapData(tokenIn, tokenOut, amountIn / 10 ** from_decimal, networkID);
        } else if (dex[0] === 3) {
            console.log("Buying in Paraswap");
            buyPrice = await getSwapTransaction(tokenIn, tokenOut, amountIn, from_decimal, to_decimal, networkID);
        }

        console.log(buyPrice.amount / (10 ** to_decimal))
        let sellAmount = buyPrice.amount;

        if (dex[1] === 0) {
            console.log("Selling in 0x");
            sellPrice = await getswapData(tokenOut, tokenIn, sellAmount, networkID);
        } else if (dex[1] === 1) {
            console.log("Selling in One Inch");
            sellPrice = await getSwapInchTransaction(tokenOut, tokenIn, sellAmount, networkID);
        } else if (dex[1] === 2) {
            console.log("Selling in Open Ocean");
            sellPrice = await getOpenoceanSwapData(tokenOut, tokenIn, sellAmount / 10 ** to_decimal, networkID);
        } else if (dex[1] === 3) {
            console.log("Selling in Paraswap");
            sellPrice = await getSwapTransaction(tokenOut, tokenIn, sellAmount, to_decimal, from_decimal, networkID);
        }

        console.log(sellPrice.amount / (10 ** from_decimal))

        let inAmount = parseInt(amount) + parseFloat(amount * (0.05 / 100));
        let checkProfit = parseFloat(sellPrice.amount / (10 ** from_decimal)) - parseFloat(inAmount);
        const minus_plus = checkProfit <= 0 ? -Math.abs(checkProfit) : Math.abs(checkProfit)
        let profitPercent = (minus_plus / amount) * 100;
        console.log(sellPrice.amount / (10 ** from_decimal), inAmount, checkProfit)

        let data = {
            profitPercent: profitPercent,
            profitAmount: minus_plus,
            buyData: buyPrice.data,
            sellData: sellPrice.data
        }

        res.status(200).send({ data: data })

    } catch (error) {
        console.error('Error resetting pairs:', error);
        res.sendStatus(500);
    }
})

app.get('/apiv4/getPairs', async (req, res) => {
    try {
        const {from, quantity } = req.query;

        if (!from || !quantity) {
            return res.status(400).send('Missing query parameters');
        }

        const Token = from;
        const Pricedata = await axios.get(`https://min-api.cryptocompare.com/data/price?api_key=afb9c2ae7b1584cd4fdf5185d22982633f6ac3d5f3cdf109debfe8e307d2b940&fsym=${Token}&tsyms=USD`);
        const amount = Number(quantity) / Pricedata.data.USD
        
        const AmountUSD = amount;
        

        let pairs = JSON.parse(polygon_pairs);
        const listedPairs = pairs.filter(pair =>
            pair.from === from && ['WMATIC', 'USDT', 'DAI', 'USDC.e', 'LINK', 'WBTC', 'WETH'].includes(pair.to)
        );
        let newPairs = [];

        await Promise.all(listedPairs.map(async (pair, index) => {
            const openOceanData = await generateAIopenOcean(pair, AmountUSD, 137);
            const buyResponse = openOceanData.buyAmountOpenOcean;
            if (buyResponse === 0) {
                return false
            }
            // Calculate profit percentage for this specific pair
            let profitPercent = generateProfitPercentage(quantity);
            let profitAmount = calculateProfitAmount(AmountUSD, profitPercent);

            const result = {
                from_symbols: pair.from,
                to_symbol: pair.to,
                from_dex: "Open Ocean",
                to_dex: "Open Ocean",
                buy_price: buyResponse,
                sell_price: AmountUSD + profitAmount,
                Profit_Amount: profitAmount,
                Profit_Percentage: profitPercent.toFixed(3),
                type: 'M'
            };

            newPairs.push(result);
        }));

        res.send({ pairs: newPairs });
        console.log(newPairs);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

function generateProfitPercentage(amount) {
    const maxPercentage = 0.8;
    const minPercentage = 0.5;
    const minAmount = 10;
    const maxAmount = 100;

    // Calculate the base percentage using linear interpolation
    let basePercentage = maxPercentage - ((amount - minAmount) / (maxAmount - minAmount)) * (maxPercentage - minPercentage);

    // Generate a random factor to vary the percentage
    const randomFactor = Math.random(); // Generates a random number between 0 and 1
    const range = maxPercentage - minPercentage;
    const randomPercentage = minPercentage + (range * randomFactor);

    // Blend the base percentage and random percentage
    const finalPercentage = (basePercentage + randomPercentage) / 2;

    return finalPercentage;
}


function calculateProfitAmount(amount, percentage) {
    return amount * (percentage / 100);
}








const Paraswap_price_API_URL = "https://apiv5.paraswap.io/prices?";
const Paraswap_swap_API_URL = "https://apiv5.paraswap.io/transactions/137/";

const API_QUOTE_URL = '	https://polygon.api.0x.org/swap/v1/quote?';
const OPENOCEAN_URL = "https://open-api-pro.openocean.finance/v3/137/swap_quote?";
const API_URL = "https://api.1inch.dev/swap/v6.0/137/swap";
const generator = "0x1F1A394838720FB7B0FBB174CD3F165B554Db685"



async function getSwapTransaction(sellToken, buyToken, amount, srcDecimal, destDecimal, networkID) {
    let priceRoute;
    let Paraswap_price = "http://api-partners.paraswap.io/prices?";
    let Paraswap_swap = `http://api-partners.paraswap.io/transactions/${networkID}/`;
    try {
        const config = {
            headers: { "x-api-key": "KBhP2n6w6o2E08iBoSZ686QbAOYZCaOs9bF3KcSm" },
            params: {
                srcToken: sellToken,
                srcDecimals: srcDecimal,
                destToken: buyToken,
                destDecimals: destDecimal,
                amount: amount,
                network: networkID,
                side: "SELL",
                maxImpact: 15,
                slippage: 10,
                excludeDEXS: 'UniswapV3'
            }
        };
        let response = await axios.get(Paraswap_price, config);
        priceRoute = (response.data.priceRoute);
        try {
            let params = {
                srcToken: sellToken,
                destToken: buyToken,
                srcAmount: amount,
                destAmount: priceRoute.destAmount,
                priceRoute: priceRoute,
                userAddress: "0x1F1A394838720FB7B0FBB174CD3F165B554Db685",
                receiver: "0x1F1A394838720FB7B0FBB174CD3F165B554Db685",
                partner: "anon",
                srcDecimals: srcDecimal,
                destDecimals: destDecimal,
                ignoreChecks: true
            }
            response = await axios.post(Paraswap_swap, params, { headers: config.headers });
            return ({ data: response.data.data, amount: priceRoute.destAmount })
        } catch (error) {
            console.log('Error making API request:', error);
        }
    } catch (error) {
        console.log(error);
    }
}

async function getswapData(sellToken, buyToken, sellAmount, networkID) {
    let API_QUOTE_URL;
    if (networkID === 137) {
        API_QUOTE_URL = 'https://polygon.api.0x.org/swap/v1/quote?';
    } else if (networkID === 10) {
        API_QUOTE_URL = 'https://optimism.api.0x.org/swap/v1/quote?';
    }

    const config = {
        headers: {
            "0x-api-key": "4462a548-dfd7-4dbb-9af6-632f6f15fb38"
        },
        params: {
            "sellToken": sellToken,
            "buyToken": buyToken,
            "sellAmount": sellAmount,
            "enableSlippageProtection": true

        }
    };
    try {
        const response = await axios.get(API_QUOTE_URL, config);
        return ({ data: response.data.data, amount: response.data.buyAmount })
    } catch (error) {
        console.error('Error making API request:', error);
    }
}

async function getOpenoceanSwapData(sellToken, buyToken, sellAmount, networkID) {
    const OPENOCEAN_URL = `https://open-api-pro.openocean.finance/v3/${networkID}/swap_quote?`;

    const config = {
        headers: {
            "apikey": "Qdc1YAmzA6ZtzASUoXZQuULntrmP7UvI"
        },
        params: {
            "inTokenAddress": sellToken,
            "outTokenAddress": buyToken,
            "amount": sellAmount,
            "slippage": 10,
            "gasPrice": 200,
            "account": generator,
            // "disabledDexIds": 15
        }
    };
    try {
        const response = await axios.get(OPENOCEAN_URL, config);
        //console.log(response)
        return ({ data: response.data.data.data, amount: response.data.data.outAmount })
    } catch (error) {
        console.error('Error making API request:', error);
    }
}

async function getSwapInchTransaction(sellToken, buyToken, amount, networkID) {
    const API_URL = `https://api.1inch.dev/swap/v6.0/${networkID}/swap`;

    try {
        const config = {
            headers: {
                "Authorization": "n0nGRCXhBchS6YXa17dHO3xG5CSHoodQ"
            },
            params: {
                src: sellToken,
                dst: buyToken,
                amount: amount,
                slippage: 10,
                from: "0x6423F60CCF38e9D8bb476d01e48Fd17BF4d36481",
                disableEstimate: true,
                account: generator,
                excludedSources: 'Uniswap'
            }
        };
        try {
            const response = await axios.get(API_URL, config);
            return ({ data: response.data.tx.data, amount: response.data.dstAmount })
        } catch (error) {
            console.error('Error making API request:', error.response.data);
        }
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}





app.get('/apiv4/sample', (req, res) => {
    connection.query('SELECT * FROM pair_data', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});




app.listen(3006, (err) => {
    if (err) throw err;
    console.log('Port running on 3006')
})

