import { Sequelize, DataTypes, where } from "sequelize";
import { format } from "date-fns";
import pkg from 'pg';
const { Client } = pkg;

import { configDotenv } from "dotenv";
configDotenv();

const sequelize = new Sequelize(
  process.env.DB_SCHEMA,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.SERVER_PORT,
    dialect: process.env.DB_DIALECT,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    hooks: {
      beforeConnect: async (config) => {

        
        try {
          const schemaName = "cart_db";
        
          // Conexão temporária com o banco padrão do PostgreSQL (geralmente "postgres")
          const tempSequelize = new Sequelize(
            `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.SERVER_PORT}/postgres`
          );
        
          // Conexão usando o Client do 'pg' para verificar se o banco já existe
          const client = new Client({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: "postgres",
          });
        
          await client.connect();
        
          // Consulta para verificar se o banco já existe
          const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${schemaName}';`;
          const res = await client.query(checkDbQuery);
        
          if (res.rowCount === 0) {
            // O banco de dados não existe, então criamos
            await tempSequelize.query(`CREATE DATABASE "${schemaName}";`);
            console.log(`Banco de dados '${schemaName}' criado com sucesso.`);
          } else {
            console.log(`Banco de dados '${schemaName}' já existe.`);
          }
        
          // Fecha as conexões
          await client.end();
          await tempSequelize.close();
        } catch (error) {
          console.error("Erro ao criar/verificar o banco de dados:", error);
        }
        
      },
    },
  }
);

try {
  await sequelize.authenticate();
  console.log("A conexão foi estabelecida com sucesso!");
} catch (error) {
  console.error("Não foi possível conectar a base de dados:", error);
}

export const User = sequelize.define("User", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export const CartHeader = sequelize.define("CartHeader", {
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalvalue: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
});

export const CartDetail = sequelize.define("CartDetail", {
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
});

export const Classification = sequelize.define("Classification", {
  // id : {
  //     type: DataTypes.INTEGER,
  //     autoIncrement: true,
  //     primaryKey: true,
  // },
  classification: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

User.hasOne(CartHeader, {
  foreignKey: "userId",
  onDelete: "CASCADE", // Garante exclusão em cascata
});
CartHeader.belongsTo(User, {
  foreignKey: "userId",
});

// Definindo a associação um-para-muitos
CartHeader.hasMany(CartDetail, {
  foreignKey: "referenceId",
  onDelete: "CASCADE", // Garante exclusão em cascata
});
CartDetail.belongsTo(CartHeader, {
  foreignKey: "referenceId",
});

CartDetail.hasOne(Classification, {
  foreignKey: "itemId",
  onDelete: "CASCADE", // Garante exclusão em cascata
});
Classification.belongsTo(CartDetail, {
  foreignKey: "itemId",
});

async function syncDatabase() {
  await sequelize.sync({ force: true });
  console.log("Tabelas sincronizadas com sucesso!");
}

syncDatabase();

export async function checkRefKey(objkey) {
  try {
    const regCount = await CartHeader.count({
      where: { reference: objkey.refkey },
      include: [
        {
          model: User,
          // attributes: ["name", "email"],
          where: { email: objkey.email },
        },
      ],
    });
    return regCount;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function createCartItem(cartItem) {
  try {
    const cartDetail = cartItem.Items.map((element) => {
      // Divide a string em dia, mês e ano
      let [dia, mes, ano] = element.date.split("/");
      // Cria um objeto Date usando ano, mês e dia
      // Note que o mês em Date começa em 0 (janeiro = 0), então subtraímos 1
      let data = new Date(ano, mes - 1, dia);
      return {
        date: format(data, "yyyy-MM-dd"),
        description: element.description,
        value: element.value,
        // referenceId: cartHeader.id,
        Classification: { classification: element.classification },
      };
    });

    const cartUser = await User.create(
      {
        name: cartItem.user.name,
        email: cartItem.user.email,

        CartHeader: {
          reference: cartItem.header.reference,
          totalvalue: cartItem.header.totalvalue,

          CartDetails: cartDetail,
        },
      },
      {
        include: [
          {
            model: CartHeader,
            include: [{ model: CartDetail, include: [Classification] }],
            //   model: CartDetail,
            //   include: [Classification],
            // }],
          },
        ],
      }
    );

    // const cartHeader = await CartHeader.create(
    //   {
    //     reference: cartItem.header.reference,
    //     totalvalue: cartItem.header.totalvalue,

    //     CartDetails: cartDetail,
    //   },
    //   {
    //     include: [
    //       {
    //         model: CartDetail,
    //         include: [Classification],
    //       },
    //     ],
    //   }
    // );

    console.log(`Registros criados referente ao ${cartItem.header.reference}`);
    return `Registros criados referente ao ${cartItem.header.reference}`;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function updateCartItem(cartItem) {
  const transaction = await sequelize.transaction();

  try {
    const cartHeader = await CartHeader.findOne({
      where: { reference: cartItem.header.reference },
      include: [
        {
          model: User,
          attributes: ["name", "email"],
          where: { email: cartItem.user.email },
        },
      ],
    });

    if (!cartHeader) {
      throw new Error("Registro não encontrado");
    }

    let headerRef = cartHeader.dataValues.reference;
    let headerId = cartHeader.dataValues.id;
    let headerData = {
      reference: headerRef,
      totalvalue: cartItem.header.totalvalue,
    };

    await CartHeader.update(headerData, {
      where: { reference: headerRef },
      fields: ["totalvalue"],
      transaction: transaction,

      include: [
        {
          model: User,
          attributes: ["name", "email"],
          where: { email: cartItem.user.email },
        },
      ],
    });

    const cartDetailupd = cartItem.Items.map((element) => {
      // Divide a string em dia, mês e ano
      let [dia, mes, ano] = element.date.split("/");
      // Cria um objeto Date usando ano, mês e dia
      // Note que o mês em Date começa em 0 (janeiro = 0), então subtraímos 1
      let data = new Date(ano, mes - 1, dia);
      return {
        date: format(data, "yyyy-MM-dd"),
        description: element.description,
        value: element.value,
        referenceId: headerId,
        classification: element.classification,
      };
    });

    for (const element of cartDetailupd) {
      const cartDetailob = await CartDetail.findOne({
        where: {
          referenceId: element.referenceId,
          description: element.description,
        },
        transaction: transaction,
      });
      if (!cartDetailob)
        throw new Error(`CartDetail ${element.description} não encontrado`);

      await cartDetailob.update(
        {
          date: element.date,
          description: element.description,
          value: element.value,
          referenceId: element.referenceId,
        },
        {
          fields: ["value"],
          transaction: transaction,
        }
      );

      const classification = await Classification.findOne({
        where: { itemId: cartDetailob.dataValues.id },
        transaction: transaction,
      });

      await classification.update(
        {
          classification: element.classification,
          itemId: cartDetailob.dataValues.id,
        },
        {
          fields: ["classification"],
          transaction: transaction,
        }
      );
    }
    // Confirma a transação
    await transaction.commit();
    console.log("Atualização bem-sucedida!");
    return "Atualização bem-sucedida!";
  } catch (error) {
    // Reverte a transação em caso de erro
    await transaction.rollback();
    if (error instanceof Sequelize.UniqueConstraintError) {
      console.error("Erro de chave única:", error.message);
    } else if (error instanceof Sequelize.ValidationError) {
      console.error(
        "Erro de validação:",
        error.errors.map((err) => err.message)
      );
    } else if (error instanceof Sequelize.DatabaseError) {
      console.error("Erro no banco de dados:", error.message);
    } else {
      console.error("Erro desconhecido:", error);
    }
  }
}

export async function deleteDetail(detailId) {
  try {
    const deletedCount = await CartDetail.destroy({
      where: {
        id: detailId,
      },
    });

    if (deletedCount > 0) {
      console.log(`Registro com ID ${detailId} foi excluído com sucesso.`);
      return {
        id: detailId,
        resposta: `Registro com ID ${detailId} foi excluído com sucesso.`,
      };
    } else {
      console.log(`Nenhum registro encontrado com ID ${detailId}.`);
      return {
        id: detailId,
        resposta: `Nenhum registro encontrado com ID ${detailId}.`,
      };
    }
  } catch (error) {
    throw new Error(error);
  }
}

export async function getCartItems(objkey) {
  const { refkey, email } = objkey;
  const CartItemWithAssociations = await CartHeader.findOne({
    where: { reference: refkey },
    include: [
      {
        model: User,
        // attributes: ["name", "email"],
        where: { email: email },
      },
      { model: CartDetail, include: Classification },
    ],
  });
  return CartItemWithAssociations;
}

export async function deleteRefKey(objkey) {
  const { refKey, email } = objkey;
  try {
    const deletedCount = await CartHeader.destroy({
      where: { reference: refKey },
      include: [
        {
          model: User,
          // attributes: ["name", "email"],
          where: { email: email },
        },
      ],
    });
    if (deletedCount > 0) {
      console.log(`Extrato ${refKey} foi excluído com sucesso.`);
      return {
        reference: refKey,
        resposta: `Extrato ${refKey} foi excluído com sucesso.`,
      };
    } else {
      console.log(`Nenhum extrato encontrado com refkey ${refKey}.`);
      return {
        reference: refKey,
        resposta: `Nenhum registro encontrado com ID ${refKey}.`,
      };
    }
  } catch (error) {
    throw new Error(error);
  }
}

export async function getCartItemsYear(objkey) {
  const refkeys = objkey.refKeys.map((el) => {
    return { reference: el.refkey };
  });
  const cartItemsYear = await CartHeader.findAll({
    where: {
      [Sequelize.Op.or]: refkeys,
    },
    include: [
      {
        model: User,
        // attributes: ["name", "email"],
        where: { email: objkey.email },
      },
      { model: CartDetail, include: Classification },
    ],
  });
  return cartItemsYear;
}
