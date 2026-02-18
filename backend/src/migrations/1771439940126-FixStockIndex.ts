import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStockIndex1771439940126 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Hapus foreign key yang mereference stocks
    await queryRunner.query(`
      ALTER TABLE transaction_items 
      DROP FOREIGN KEY FK_fe605af9792ba6d5a8121e3fd85
    `);

    // 2. Hapus index lama
    await queryRunner.query(`
      DROP INDEX IDX_795ff5fc02cc1bffb01719ba26 ON stocks
    `);

    // 3. Buat index baru (lebih baik)
    await queryRunner.query(`
      CREATE INDEX IDX_stocks_product_batch 
      ON stocks(product_id, batch_code)
    `);

    // 4. Tambah kembali foreign key
    await queryRunner.query(`
      ALTER TABLE transaction_items 
      ADD CONSTRAINT FK_transaction_items_stock 
      FOREIGN KEY (stock_id) 
      REFERENCES stocks(id) 
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback jika diperlukan
    await queryRunner.query(`
      ALTER TABLE transaction_items 
      DROP FOREIGN KEY FK_transaction_items_stock
    `);

    await queryRunner.query(`
      DROP INDEX IDX_stocks_product_batch ON stocks
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_795ff5fc02cc1bffb01719ba26 
      ON stocks(product_id, batch_code)
    `);

    await queryRunner.query(`
      ALTER TABLE transaction_items 
      ADD CONSTRAINT FK_fe605af9792ba6d5a8121e3fd85 
      FOREIGN KEY (stock_id) 
      REFERENCES stocks(id)
    `);
  }
}
