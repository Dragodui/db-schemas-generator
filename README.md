# **Database Schema Generator**


**Visualize MySQL/PostgreSQL schemas using Next.js + ReactFlow: [Demo](https://db-schemas-generator.vercel.app/)**  

A mini web app that converts **JSON schema definitions** into interactive database diagrams. Built with:  
- **Next.js** (App Router)  
- **ReactFlow** (for graph visualization)  
- **ShadCN UI** (for clean components)  

---

### Example Schema Format:  
```json
{
  "tables": [
    {
      "name": "users",
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true },
        { "name": "email", "type": "varchar", "unique": true }
      ]
    },
    {
      "name": "posts",
      "foreignKeys": [
        {
          "column": "user_id",
          "references": { "table": "users", "column": "id" }
        }
      ]
    }
  ]
}
```

---

## **Future features**  
**UI Schema Editor** – Visually create schemas without writing JSON  
**SQL Export** – Generate `CREATE TABLE` scripts for MySQL/PostgreSQL  

---
