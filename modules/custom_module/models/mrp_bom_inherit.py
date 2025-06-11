from odoo import fields, models, api
from odoo.tools import float_round


class MrpBom(models.Model):
    _inherit = 'mrp.bom'

    total_cost = fields.Float(
        string="Coût Total",
        compute='_compute_total_cost',
        store=True,
        digits='Product Price',
        help="Coût total de la nomenclature basé sur les prix standards des composants"
    )

    cost_per_unit = fields.Float(
        string="Coût par Unité",
        compute='_compute_cost_per_unit',
        store=True,
        digits='Product Price',
        help="Coût par unité de produit fini"
    )

    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id,
        help="Devise pour l'affichage monétaire"
    )

    @api.depends('bom_line_ids.line_cost')
    def _compute_total_cost(self):
        for bom in self:
            bom.total_cost = sum(line.line_cost for line in bom.bom_line_ids)

    @api.depends('total_cost', 'product_qty')
    def _compute_cost_per_unit(self):
        for bom in self:
            if bom.product_qty > 0:
                bom.cost_per_unit = bom.total_cost / bom.product_qty
            else:
                bom.cost_per_unit = 0.0


class MrpBomLine(models.Model):
    _inherit = 'mrp.bom.line'

    standard_price = fields.Float(
        string='Prix Standard',
        related='product_id.standard_price',
        readonly=True,
        digits='Product Price',
        store=False  # Pas besoin de stocker car c'est un related
    )

    line_cost = fields.Float(
        string="Coût Total",
        compute='_compute_line_cost',
        store=True,
        digits='Product Price',
        help="Coût total de cette ligne (Prix Standard × Quantité)"
    )

    cost_per_finished_product = fields.Float(
        string="Coût/Unité Finie",
        compute='_compute_cost_per_finished_product',
        store=True,
        digits='Product Price',
        help="Coût de ce composant par unité de produit fini"
    )

    @api.depends('product_id.standard_price', 'product_qty', 'product_uom_id')
    def _compute_line_cost(self):
        for line in self:
            if line.product_id and line.product_qty:
                # Conversion d'unité si nécessaire
                qty_in_product_uom = line.product_qty
                if line.product_uom_id and line.product_uom_id != line.product_id.uom_id:
                    qty_in_product_uom = line.product_uom_id._compute_quantity(
                        line.product_qty,
                        line.product_id.uom_id
                    )

                line.line_cost = float_round(
                    line.product_id.standard_price * qty_in_product_uom,
                    precision_digits=self.env['decimal.precision'].precision_get('Product Price')
                )
            else:
                line.line_cost = 0.0

    @api.depends('line_cost', 'bom_id.product_qty')
    def _compute_cost_per_finished_product(self):
        for line in self:
            if line.bom_id.product_qty > 0:
                line.cost_per_finished_product = line.line_cost / line.bom_id.product_qty
            else:
                line.cost_per_finished_product = 0.0

    @api.onchange('product_id')
    def _onchange_product_id_update_cost(self):
        """Déclenche le recalcul des coûts lors du changement de produit"""
        if self.product_id:
            self._compute_line_cost()