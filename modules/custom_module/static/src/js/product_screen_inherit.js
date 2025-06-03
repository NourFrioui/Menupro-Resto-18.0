import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";

patch(ProductScreen.prototype, {

    setup() {
        super.setup(...arguments);
        this.uiState = useState({
            clicked: false,
        });
    },

    async submitOrder() {
        if (!this.uiState.clicked) {
            this.uiState.clicked = true;
            try {
                await this.pos.sendOrderInPreparationUpdateLastChange(this.currentOrder);
                this.pos.addPendingOrder([this.currentOrder.id]);
            } finally {
                this.uiState.clicked = false;
                this.pos.showScreen("FloorScreen");

            }
        }
    },

});
