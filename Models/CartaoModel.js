import { Sequelize, INTEGER, STRING } from "sequelize";

const sequelize = new Sequelize(process.env.DB_SCHEMA, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log("A conexão foi estabelecida com sucesso!");
  })
  .catch((err) => {
    console.error("Não foi possível conectar a base de dados:", err);
  });

const task = sequelize.define("tasks", {
  id: {
    type: INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  task: {
    type: STRING,
  },
  assignee: {
    type: STRING,
  },
  status: {
    type: STRING,
  },
});

sequelize.sync();

const criarTask = function (newTask) {
  return new Promise((resolve, reject) => {
    task
      .create({
        task: newTask.task,
        assignee: newTask.assignee,
        status: newTask.status,
      })
      .then((it) => {
        resolve([it.dataValues]);
      })
      .catch(function (err) {
        reject({
          statusCode: "Error",
          message: "Erro durante a criação da tarefa: " + err,
        });
      });
  });
};

const atualizarTask = function (updateTask, taskId) {
  return new Promise((resolve, reject) => {
    task
      .update(
        { status: updateTask.status },
        { where: { id: taskId } }
      )
      .then((it) => {
        resolve(it);
      })
      .catch(function (err) {
        reject({
          statusCode: "Error",
          message: "Erro durante a modificação da tarefa: " + err,
        });
      });
  });
};

const selecionarTasks = () => {
  return new Promise((resolve, reject) => {
    task
      .findAll()
      .then((tasks) => {
        resolve(tasks);
      })
      .catch(function (err) {
        reject({
          statusCode: "Error",
          message: "Erro ao selecionar todas as tarefas: " + err,
        });
      });
  });
};

const selecionarTask = (taskId) => {
  return new Promise((resolve, reject) => {
    console.log(taskId);
    task
      .findByPk(taskId)
      .then((task) => {
        console.log(task);
        resolve(task);
      })
      .catch(function (err) {
        reject({
          statusCode: "Error",
          message: "Erro ao selecionar a tarefa: " + err,
        });
      });
  });
};

const deletarTask = (taskId) => {
  return new Promise((resolve, reject) => {
    task
      .destroy({
        where: { id: taskId },
      })
      .then((task) => {
        if (!task) {
          reject({
            statusCode: "Error",
            message: "Registro não encontrado!",
          });
          return;
        }
        resolve([task]);
      })
      .catch(function (err) {
        reject({
          statusCode: "Error",
          message: "Erro durante a seleção das tarefas: " + err,
        });
      });
  });
};

module.exports = {
  selecionarTasks,
  selecionarTask,
  criarTask,
  deletarTask,
  atualizarTask,
};
