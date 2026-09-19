import { Router } from "express";
import { getSellerOrders,getSellerOrderById, updateSellerOrderStatus } from "../services/sellerOrders.js";

const router = Router();

router.patch("/order/:orderId/status" , async(req, res) => {
  
  try{

    const {orderId} = req.params;
  const {status} = req.body;

  // console.log("STEP STATUS 2 - Order ID:", orderId);
  // console.log("STEP STATUS 2 - Status:", status);

  const updateOrder = await updateSellerOrderStatus(orderId, status)


  return res.status(200).json({
     success: true,
      message: "Order status updated successfully",
      data: updateOrder,
  });

  }catch(err:any){
    console.error("STEP STATUS 2 - ERROR:", err);
      return res.status(500).json({
      success: false,
      message: err?.message || "Failed to update order status",
    });
  }
})


router.get("/order/:orderId" , async(req, res) => {
  // console.log("Step 2 - Route HIT")

  try{
    const {orderId} = req.params;

    // console.log("Step 2 - Order ID:" , orderId)

    const order = await getSellerOrderById(orderId)

    // console.log("Step 2 - Service response: " , order)

    if(!order){
      return res.status(404).json({
        success : false,
        message : "Order Not found"
      })
    }

    return res.status(200).json({
        success: true,
        message: "Seller order fetched Successfully",
        data:order,
      })


  }catch(err:any) {
    console.error("STEP 2 - ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to fetch seller order",
    });
  }
})


router.get("/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const orders = await getSellerOrders(sellerId);

    res.status(200).json({
      success: true,
      message: "Seller orders fetched successfully",
      data: orders,
    });
  } catch (error: any) {
    console.error("GET SELLER ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch seller orders",
    });
  }
});

export default router;
