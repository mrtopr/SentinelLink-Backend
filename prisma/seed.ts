import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@sentinellink.com';
    const adminPassword = 'password';

    console.log('Seed: Checking for existing admin user...');

    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingAdmin) {
        console.log('Seed: Admin user already exists. Updating password...');
        const hashed = await bcrypt.hash(adminPassword, 12);
        await prisma.user.update({
            where: { email: adminEmail },
            data: { passwordHash: hashed, role: Role.ADMIN },
        });
    } else {
        console.log('Seed: Creating new admin user...');
        const hashed = await bcrypt.hash(adminPassword, 12);
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: adminEmail,
                passwordHash: hashed,
                role: Role.ADMIN,
            },
        });
    }

    console.log('Seed: Completed successfully!');
}

main()
    .catch((e) => {
        console.error('Seed Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
