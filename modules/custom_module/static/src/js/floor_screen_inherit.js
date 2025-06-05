/** @odoo-module */

import { FloorScreen } from "@pos_restaurant/app/floor_screen/floor_screen";
import { patch } from "@web/core/utils/patch";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useState } from "@odoo/owl";

patch(FloorScreen.prototype, {
    setup() {
        super.setup();
        const pos = usePos();
        this.pos = pos;
        const currentEmployee = pos?.cashier;
        this.allowedFloors = currentEmployee?.allowed_floor_ids || [];

        const allowedFloorIds = this.allowedFloors
            .map(floor => Number(floor?.id ?? floor?.data?.id))
            .filter(id => id);

        const currentFloorId = pos.currentFloor?.id ?? pos.currentFloor?.data?.id;

        let floorToUse = pos.currentFloor;

        if (!allowedFloorIds.includes(currentFloorId)) {
            floorToUse = this.allowedFloors[0];
            pos.currentFloor = floorToUse;
        }

        this.state = useState({
            selectedFloorId: floorToUse?.id ?? null,
            floorHeight: "100%",
            floorWidth: "100%",
            selectedTableIds: [],
            potentialLink: null,
        });


    },

    selectFloor(floor) {
        const floorId = floor?.id ?? floor?.data?.id ?? null;

        if (floorId === null) {
            console.warn("⚠️ Impossible de lire l'id du floor sélectionné");
            return;
        }

        const allowedFloorIds = this.allowedFloors
            .map(floor => Number(floor?.id ?? floor?.data?.id))
            .filter(id => id);

        if (!allowedFloorIds.includes(Number(floorId))) {
            console.warn(`⛔ Accès refusé à l'étage : ${floor?.name || "inconnu"}`);
            return;
        }

        this.pos.currentFloor = floor;
        this.state.selectedFloorId = Number(floorId);

        this.unselectTables();

    },

    getChangeCount(table) {
        const result = super.getChangeCount(table);
        const tableOrders = this.pos.models["pos.order"].filter(
            (o) => o.table_id?.id === table.id && !o.finalized
        );
        if (result.changes > 0 && tableOrders.length) {
            for (const order of tableOrders) {
                if (order.pos_reference?.includes('Self-Order')) {
                    if (order.lastChangeCount === undefined) {
                        order.lastChangeCount = 0;
                    }
                    if (order.lastLinesLength === undefined) {
                        order.lastLinesLength = 0;
                    }
                    if (result.changes !== order.lastChangeCount || order.lastLinesLength !== order.lines.length) {
                        if (order.table_id) {
                            this.playSound('/custom_module/static/src/sounds/bell.wav');
                            order.lastChangeCount = result.changes;
                            order.lastLinesLength = order.lines.length;
                            break;
                        }
                    }
                }
            }
        }
        return result;
    },




    playSound(soundFile) {
        fetch(soundFile, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    const audio = new Audio(soundFile);
                    audio.muted = true;
                    audio.play().then(() => {
                        audio.muted = false;
                        audio.play().catch(error => {
                            console.log('Error playing sound after unmuting:', error);
                        });
                    }).catch(error => {
                        alert("Activez le son sur ce site pour entendre les notifications.");
                    });
                } else {
                    console.log(`Sound file not accessible: ${soundFile}`);
                }
            })
            .catch(error => {
                console.log('Error fetching sound file:', error);
            });
    }

});
