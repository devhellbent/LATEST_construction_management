// Simple test to verify models work
const { sequelize } = require('./config/database');
const { ItemCategory, Brand, Unit, Supplier, ItemMaster, Material } = require('./models');

async function testModels() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('\nTesting ItemCategory model...');
    const categories = await ItemCategory.findAll({ limit: 3 });
    console.log(`✅ Found ${categories.length} categories`);

    console.log('\nTesting Brand model...');
    const brands = await Brand.findAll({ limit: 3 });
    console.log(`✅ Found ${brands.length} brands`);

    console.log('\nTesting Unit model...');
    const units = await Unit.findAll({ limit: 3 });
    console.log(`✅ Found ${units.length} units`);

    console.log('\nTesting Supplier model...');
    const suppliers = await Supplier.findAll({ limit: 3 });
    console.log(`✅ Found ${suppliers.length} suppliers`);

    console.log('\nTesting ItemMaster model...');
    const items = await ItemMaster.findAll({ 
      limit: 3,
      include: [
        { model: ItemCategory, as: 'category', attributes: ['category_name'] },
        { model: Brand, as: 'brand', attributes: ['brand_name'] },
        { model: Unit, as: 'unit', attributes: ['unit_name'] }
      ]
    });
    console.log(`✅ Found ${items.length} items`);
    
    if (items.length > 0) {
      console.log('Sample item:', {
        name: items[0].item_name,
        code: items[0].item_code,
        category: items[0].category?.category_name,
        brand: items[0].brand?.brand_name,
        unit: items[0].unit?.unit_name
      });
    }

    console.log('\nTesting Material model...');
    const materials = await Material.findAll({ limit: 3 });
    console.log(`✅ Found ${materials.length} materials`);

    console.log('\n🎉 All models are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testModels();
