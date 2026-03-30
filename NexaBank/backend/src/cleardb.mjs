import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDB() {
    try {
        const deleteTransactions = prisma.transaction.deleteMany({});
        // const deleteAccounts = prisma.account.deleteMany({});
        // const deleteCustomers = prisma.customer.deleteMany({});

        await prisma.$transaction([deleteTransactions, deleteAccounts, deleteCustomers]);
        console.log('Cleared all tables in the database');
    } catch (error) {
        if (error.code === 'P5010') {
            console.error(`Error deleting ${error.meta.modelName}: ${error.message}`);
        } else {
            console.error(error);
        }
    }
}

clearDB()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
