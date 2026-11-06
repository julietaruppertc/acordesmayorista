const crypto = require('crypto');
const {pool} = require('../src/config/database');
const {expireBatch} = require('../src/jobs/expireReservations');
let categoryId, orderId;
const products=[];
const suffix=crypto.randomUUID();
beforeAll(async()=>{
  categoryId=(await pool.query('INSERT INTO catalog.categories(name) VALUES($1) RETURNING id',['Rollback '+suffix])).rows[0].id;
  for(let i=0;i<2;i++){
    const id=(await pool.query('INSERT INTO catalog.products(category_id,name,price) VALUES($1,$2,100) RETURNING id',[categoryId,`Rollback ${suffix} ${i}`])).rows[0].id;
    products.push(id);
    await pool.query('INSERT INTO inventory.stock(product_id,on_hand,reserved,version) VALUES($1,2,$2,1)',[id,i===0?1:0]);
  }
  orderId=(await pool.query("INSERT INTO orders.orders(user_id,status,total,expires_at,trace_id) VALUES($1,'PENDING_PAYMENT',200,NOW()-INTERVAL '30 days',$2) RETURNING id",['rollback-'+suffix,'rollback-'+suffix])).rows[0].id;
  for(const id of products) await pool.query('INSERT INTO orders.order_items(order_id,product_id,product_name,unit_price,quantity) VALUES($1,$2,$3,100,1)',[orderId,id,'Rollback fixture']);
});
afterAll(async()=>{
  if(orderId){
    await pool.query("DELETE FROM mq.outbox WHERE payload->>'orderId'=$1",[orderId]);
    await pool.query('DELETE FROM orders.order_items WHERE order_id=$1',[orderId]);
    await pool.query('DELETE FROM orders.orders WHERE id=$1',[orderId]);
  }
  for(const id of products){await pool.query('DELETE FROM inventory.stock WHERE product_id=$1',[id]);await pool.query('DELETE FROM catalog.products WHERE id=$1',[id]);}
  if(categoryId)await pool.query('DELETE FROM catalog.categories WHERE id=$1',[categoryId]);
  await pool.end();
});
it('rollback real: no expira ni emite evento si falla la liberacion de una reserva',async()=>{
  const before=(await pool.query('SELECT product_id,reserved,version FROM inventory.stock WHERE product_id=ANY($1::uuid[]) ORDER BY product_id',[products])).rows;
  await expect(expireBatch()).rejects.toMatchObject({code:'RESERVATION_STATE_CONFLICT',statusCode:409});
  const after=(await pool.query('SELECT product_id,reserved,version FROM inventory.stock WHERE product_id=ANY($1::uuid[]) ORDER BY product_id',[products])).rows;
  expect(after).toEqual(before);
  expect((await pool.query('SELECT status FROM orders.orders WHERE id=$1',[orderId])).rows[0].status).toBe('PENDING_PAYMENT');
  expect((await pool.query("SELECT count(*)::int AS n FROM mq.outbox WHERE payload->>'orderId'=$1",[orderId])).rows[0].n).toBe(0);
});
