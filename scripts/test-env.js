// Test script to verify CHIP environment variables
console.log('=== CHIP Environment Variables Test ===');
console.log('CHIP_TEST_SECRET_KEY exists:', !!process.env.CHIP_TEST_SECRET_KEY);
console.log('CHIP_TEST_SECRET_KEY length:', process.env.CHIP_TEST_SECRET_KEY?.length);
console.log('CHIP_TEST_SECRET_KEY (first 20 chars):', process.env.CHIP_TEST_SECRET_KEY?.substring(0, 20));
console.log('CHIP_TEST_SECRET_KEY (last 20 chars):', process.env.CHIP_TEST_SECRET_KEY?.substring(process.env.CHIP_TEST_SECRET_KEY.length - 20));
console.log('');
console.log('CHIP_LIVE_SECRET_KEY exists:', !!process.env.CHIP_LIVE_SECRET_KEY);
console.log('CHIP_LIVE_SECRET_KEY length:', process.env.CHIP_LIVE_SECRET_KEY?.length);
console.log('');
console.log('CHIP_BRAND_ID:', process.env.CHIP_BRAND_ID);
console.log('');
console.log('Expected TEST key length: 88');
console.log('Expected LIVE key length: 88');
