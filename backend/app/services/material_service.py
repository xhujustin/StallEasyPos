from typing import List, Optional
from decimal import Decimal
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.material import Material
from app.schemas.materials import MaterialCreate, MaterialUpdate
from app.models.material_inventory import MaterialInventoryItem, MaterialPurchase, MaterialInventoryTransaction
from app.schemas.materials import InventoryItemCreate, MaterialPurchaseCreate
from app.models.material_composition import MaterialComposition
from app.schemas.materials import CompositeMaterialCreate
from app.models.product_material import ProductMaterial
from app.models.product import Product
from app.models.product_attribute import ProductAttribute, ProductAttributeOption, OptionMaterial
from app.models.material_group import MaterialGroup
from app.schemas.materials import MaterialGroupCreate, MaterialGroupUpdate

class MaterialService:
    @staticmethod
    async def disconnect_and_delete_material(db: AsyncSession, material_id: int, store_id: int) -> bool:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return False
        affected_composite_ids = set((await db.execute(
            select(MaterialComposition.composite_material_id).where(
                MaterialComposition.component_material_id == material_id
            )
        )).scalars().all())
        await db.execute(delete(ProductMaterial).where(ProductMaterial.material_id == material_id))
        await db.execute(delete(OptionMaterial).where(OptionMaterial.material_id == material_id))
        await db.execute(delete(MaterialComposition).where(MaterialComposition.component_material_id == material_id))
        await db.flush()
        for composite_id in affected_composite_ids:
            composite = await db.get(Material, composite_id)
            total_result = await db.execute(
                select(func.coalesce(func.sum(MaterialComposition.quantity * Material.unit_cost), 0))
                .join(Material, Material.id == MaterialComposition.component_material_id)
                .where(MaterialComposition.composite_material_id == composite_id)
            )
            if composite:
                composite.unit_cost = Decimal(total_result.scalar() or 0) / Decimal(composite.output_quantity)
        await db.delete(material)
        await db.commit()
        return True

    @staticmethod
    async def replace_and_delete_material(
        db: AsyncSession, material_id: int, replacement_id: int, store_id: int
    ) -> bool:
        source = await MaterialService.get_material(db, material_id, store_id)
        replacement = await MaterialService.get_material(db, replacement_id, store_id)
        if not source or not replacement or not replacement.is_active or source.id == replacement.id:
            return False
        if source.unit != replacement.unit or source.material_type != replacement.material_type:
            raise ValueError("替換耗材的類型與基準單位必須相同")

        direct_rows = (await db.execute(
            select(ProductMaterial).where(ProductMaterial.material_id == material_id)
        )).scalars().all()
        for row in direct_rows:
            existing = (await db.execute(select(ProductMaterial).where(
                ProductMaterial.product_id == row.product_id,
                ProductMaterial.material_id == replacement_id,
            ))).scalar_one_or_none()
            if existing:
                existing.quantity += row.quantity
                await db.delete(row)
            else:
                row.material_id = replacement_id

        option_rows = (await db.execute(
            select(OptionMaterial).where(OptionMaterial.material_id == material_id)
        )).scalars().all()
        for row in option_rows:
            existing = (await db.execute(select(OptionMaterial).where(
                OptionMaterial.option_id == row.option_id,
                OptionMaterial.material_id == replacement_id,
            ))).scalar_one_or_none()
            if existing:
                existing.quantity += row.quantity
                await db.delete(row)
            else:
                row.material_id = replacement_id

        component_rows = (await db.execute(select(MaterialComposition).where(
            MaterialComposition.component_material_id == material_id
        ))).scalars().all()
        affected_composite_ids = {row.composite_material_id for row in component_rows}
        for row in component_rows:
            if row.composite_material_id == replacement_id:
                raise ValueError("替換後會造成組合耗材循環引用")
            existing = (await db.execute(select(MaterialComposition).where(
                MaterialComposition.composite_material_id == row.composite_material_id,
                MaterialComposition.component_material_id == replacement_id,
            ))).scalar_one_or_none()
            if existing:
                existing.quantity += row.quantity
                await db.delete(row)
            else:
                row.component_material_id = replacement_id

        await db.flush()
        for composite_id in affected_composite_ids:
            composite = await db.get(Material, composite_id)
            total_result = await db.execute(
                select(func.coalesce(func.sum(MaterialComposition.quantity * Material.unit_cost), 0))
                .join(Material, Material.id == MaterialComposition.component_material_id)
                .where(MaterialComposition.composite_material_id == composite_id)
            )
            if composite:
                composite.unit_cost = Decimal(total_result.scalar() or 0) / Decimal(composite.output_quantity)
        await db.delete(source)
        await db.commit()
        return True

    @staticmethod
    async def get_groups(db: AsyncSession, store_id: int) -> List[MaterialGroup]:
        result = await db.execute(
            select(MaterialGroup).where(MaterialGroup.store_id == store_id)
            .order_by(MaterialGroup.display_order, MaterialGroup.name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_group(db: AsyncSession, store_id: int, group_in: MaterialGroupCreate) -> MaterialGroup:
        group = MaterialGroup(store_id=store_id, **group_in.model_dump())
        db.add(group)
        await db.commit()
        await db.refresh(group)
        return group

    @staticmethod
    async def update_group(
        db: AsyncSession, group_id: int, store_id: int, group_in: MaterialGroupUpdate
    ) -> Optional[MaterialGroup]:
        result = await db.execute(select(MaterialGroup).where(MaterialGroup.id == group_id, MaterialGroup.store_id == store_id))
        group = result.scalar_one_or_none()
        if not group:
            return None
        old_name = group.name
        for field, value in group_in.model_dump(exclude_unset=True).items():
            setattr(group, field, value)
        if group.name != old_name:
            materials_result = await db.execute(
                select(Material).where(Material.store_id == store_id, Material.group_name == old_name)
            )
            for material in materials_result.scalars().all():
                material.group_name = group.name
        await db.commit()
        await db.refresh(group)
        return group

    @staticmethod
    async def delete_group(db: AsyncSession, group_id: int, store_id: int) -> bool:
        result = await db.execute(select(MaterialGroup).where(MaterialGroup.id == group_id, MaterialGroup.store_id == store_id))
        group = result.scalar_one_or_none()
        if not group:
            return False
        materials_result = await db.execute(
            select(Material).where(Material.store_id == store_id, Material.group_name == group.name)
        )
        for material in materials_result.scalars().all():
            material.group_name = None
        await db.delete(group)
        await db.commit()
        return True

    @staticmethod
    async def reorder_groups(db: AsyncSession, store_id: int, group_ids: List[int]) -> bool:
        result = await db.execute(select(MaterialGroup).where(MaterialGroup.store_id == store_id, MaterialGroup.id.in_(group_ids)))
        groups = {group.id: group for group in result.scalars().all()}
        if len(groups) != len(group_ids):
            return False
        for position, group_id in enumerate(group_ids, start=1):
            groups[group_id].display_order = position
        await db.commit()
        return True

    @staticmethod
    async def create_material(db: AsyncSession, store_id: int, material_in: MaterialCreate) -> Material:
        """建立耗材"""
        max_order_result = await db.execute(
            select(func.coalesce(func.max(Material.display_order), 0)).where(
                Material.store_id == store_id
            )
        )
        material = Material(
            store_id=store_id,
            name=material_in.name,
            unit=material_in.unit,
            stock_quantity=material_in.stock_quantity,
            unit_cost=material_in.unit_cost,
            low_stock_threshold=material_in.low_stock_threshold,
            material_type=material_in.material_type,
            output_quantity=material_in.output_quantity,
            group_name=(material_in.group_name or "").strip() or None,
            display_order=int(max_order_result.scalar_one()) + 1,
        )
        db.add(material)
        await db.flush()
        initial_purchase = None
        if (
            material.stock_quantity > 0
            and material_in.initial_purchase_quantity is not None
            and material_in.initial_purchase_unit_price is not None
            and material_in.default_purchase_unit
            and material_in.default_conversion_rate
        ):
            initial_purchase = MaterialPurchase(
                material_id=material.id,
                purchase_quantity=material_in.initial_purchase_quantity,
                purchase_unit=material_in.default_purchase_unit,
                conversion_rate=material_in.default_conversion_rate,
                base_quantity=material.stock_quantity,
                unit_price=material_in.initial_purchase_unit_price,
                total_cost=material_in.initial_purchase_quantity * material_in.initial_purchase_unit_price,
                resulting_average_cost=material.unit_cost,
                supplier=(material_in.default_supplier or "").strip() or None,
                note="建立原料時的初始進貨",
            )
            db.add(initial_purchase)
            await db.flush()

        if material.stock_quantity > 0:
            db.add(MaterialInventoryTransaction(
                material_id=material.id,
                transaction_type="PURCHASE" if initial_purchase else "OPENING_BALANCE",
                quantity_change=material.stock_quantity,
                balance_before=Decimal("0"),
                balance_after=material.stock_quantity,
                unit_cost_snapshot=material.unit_cost,
                total_cost=material.stock_quantity * material.unit_cost,
                purchase_id=initial_purchase.id if initial_purchase else None,
                reference_type="PURCHASE" if initial_purchase else None,
                reference_id=initial_purchase.id if initial_purchase else None,
                note="建立原料時的初始進貨" if initial_purchase else "建立原料時的初始庫存",
            ))
        if material_in.default_purchase_unit and material_in.default_conversion_rate:
            if material_in.default_conversion_rate <= 0:
                raise ValueError("換算量必須大於 0")
            db.add(MaterialInventoryItem(
                material_id=material.id,
                name=f"標準{material_in.default_purchase_unit}",
                purchase_unit=material_in.default_purchase_unit,
                conversion_rate=material_in.default_conversion_rate,
                supplier=(material_in.default_supplier or "").strip() or None,
            ))
        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def get_materials(db: AsyncSession, store_id: int) -> List[Material]:
        """取得店鋪所有耗材"""
        result = await db.execute(
            select(Material)
            .where(Material.store_id == store_id, Material.is_active.is_(True))
            .order_by(Material.display_order, Material.id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def reorder_materials(db: AsyncSession, store_id: int, material_ids: List[int]) -> bool:
        if len(material_ids) != len(set(material_ids)):
            return False
        result = await db.execute(
            select(Material).where(
                Material.store_id == store_id,
                Material.is_active.is_(True),
            )
        )
        materials = {material.id: material for material in result.scalars().all()}
        if set(material_ids) != set(materials):
            return False
        for position, material_id in enumerate(material_ids, start=1):
            materials[material_id].display_order = position
        await db.commit()
        return True

    @staticmethod
    async def create_composite(
        db: AsyncSession, store_id: int, composite_in: CompositeMaterialCreate
    ) -> Material:
        if composite_in.output_quantity <= 0 or not composite_in.components:
            raise ValueError("組合耗材必須有大於 0 的產出量與至少一項原料")
        ids = [item.material_id for item in composite_in.components]
        if len(ids) != len(set(ids)) or any(item.quantity <= 0 for item in composite_in.components):
            raise ValueError("原料不可重複，且使用量必須大於 0")
        result = await db.execute(
            select(Material).where(
                Material.store_id == store_id,
                Material.id.in_(ids),
                Material.is_active.is_(True),
            )
        )
        component_materials = {item.id: item for item in result.scalars().all()}
        if len(component_materials) != len(ids):
            raise ValueError("組合只能使用同店鋪的有效耗材")
        total_cost = sum(
            item.quantity * Decimal(component_materials[item.material_id].unit_cost)
            for item in composite_in.components
        )
        max_order_result = await db.execute(
            select(func.coalesce(func.max(Material.display_order), 0)).where(
                Material.store_id == store_id
            )
        )
        composite = Material(
            store_id=store_id,
            name=composite_in.name,
            unit=composite_in.unit,
            stock_quantity=Decimal("0"),
            unit_cost=total_cost / composite_in.output_quantity,
            low_stock_threshold=None,
            material_type="composite",
            output_quantity=composite_in.output_quantity,
            group_name=(composite_in.group_name or "").strip() or None,
            display_order=int(max_order_result.scalar_one()) + 1,
        )
        db.add(composite)
        await db.flush()
        for item in composite_in.components:
            db.add(MaterialComposition(
                composite_material_id=composite.id,
                component_material_id=item.material_id,
                quantity=item.quantity,
            ))
        await db.commit()
        return await MaterialService.get_material(db, composite.id, store_id)

    @staticmethod
    async def update_composite(
        db: AsyncSession, material_id: int, store_id: int, composite_in: CompositeMaterialCreate
    ) -> Optional[Material]:
        composite = await MaterialService.get_material(db, material_id, store_id)
        if not composite or composite.material_type != "composite":
            return None
        if composite_in.output_quantity <= 0 or not composite_in.components:
            raise ValueError("組合耗材必須有大於 0 的完成後總量與至少一項原料")
        ids = [item.material_id for item in composite_in.components]
        if len(ids) != len(set(ids)) or any(item.quantity <= 0 for item in composite_in.components):
            raise ValueError("原料不可重複，且使用量必須大於 0")
        result = await db.execute(select(Material).where(
            Material.store_id == store_id, Material.id.in_(ids), Material.is_active.is_(True),
        ))
        component_materials = {item.id: item for item in result.scalars().all()}
        if len(component_materials) != len(ids):
            raise ValueError("組合只能使用同店鋪的有效耗材")
        for component_id in ids:
            if component_id == material_id or await MaterialService._composite_depends_on(db, component_id, material_id):
                raise ValueError("組合耗材不可循環引用")
        total_cost = sum(
            item.quantity * Decimal(component_materials[item.material_id].unit_cost)
            for item in composite_in.components
        )
        composite.name = composite_in.name
        composite.unit = composite_in.unit
        composite.output_quantity = composite_in.output_quantity
        composite.group_name = (composite_in.group_name or "").strip() or None
        composite.unit_cost = total_cost / composite_in.output_quantity
        await db.execute(delete(MaterialComposition).where(MaterialComposition.composite_material_id == material_id))
        for item in composite_in.components:
            db.add(MaterialComposition(
                composite_material_id=material_id,
                component_material_id=item.material_id,
                quantity=item.quantity,
            ))
        await db.flush()
        await MaterialService.refresh_composite_costs(db, material_id)
        await db.commit()
        await db.refresh(composite, attribute_names=["components"])
        return composite

    @staticmethod
    async def _composite_depends_on(
        db: AsyncSession, composite_id: int, target_id: int, visited: Optional[set[int]] = None
    ) -> bool:
        if composite_id == target_id:
            return True
        visited = visited or set()
        if composite_id in visited:
            return False
        visited.add(composite_id)
        component_ids = (await db.execute(
            select(MaterialComposition.component_material_id).where(
                MaterialComposition.composite_material_id == composite_id
            )
        )).scalars().all()
        for component_id in component_ids:
            if component_id == target_id or await MaterialService._composite_depends_on(
                db, component_id, target_id, visited
            ):
                return True
        return False

    @staticmethod
    async def refresh_composite_costs(
        db: AsyncSession, component_material_id: int, visited: Optional[set[int]] = None
    ) -> None:
        visited = visited or set()
        if component_material_id in visited:
            return
        visited.add(component_material_id)
        result = await db.execute(
            select(MaterialComposition).where(MaterialComposition.component_material_id == component_material_id)
        )
        for link in result.scalars().all():
            composite = await db.get(Material, link.composite_material_id)
            component_result = await db.execute(
                select(MaterialComposition).where(MaterialComposition.composite_material_id == composite.id)
            )
            links = component_result.scalars().all()
            composite.unit_cost = sum(
                row.quantity * Decimal(row.component.unit_cost) for row in links
            ) / Decimal(composite.output_quantity)
            await MaterialService.refresh_composite_costs(db, composite.id, visited)

    @staticmethod
    async def get_material(db: AsyncSession, material_id: int, store_id: int) -> Optional[Material]:
        """取得單一耗材"""
        result = await db.execute(
            select(Material)
            .where(Material.id == material_id, Material.store_id == store_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_material(
        db: AsyncSession, 
        material_id: int, 
        store_id: int, 
        material_in: MaterialUpdate
    ) -> Optional[Material]:
        """更新耗材"""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return None

        update_data = material_in.model_dump(exclude_unset=True)
        old_quantity = Decimal(material.stock_quantity)
        for field, value in update_data.items():
            setattr(material, field, value)

        if "unit_cost" in update_data and material.material_type == "raw":
            await MaterialService.refresh_composite_costs(db, material.id)

        if "stock_quantity" in update_data:
            new_quantity = Decimal(material.stock_quantity)
            quantity_change = new_quantity - old_quantity
            if quantity_change:
                transaction_type = "ADJUSTMENT_IN" if quantity_change > 0 else "WASTE"
                db.add(MaterialInventoryTransaction(
                    material_id=material.id,
                    transaction_type=transaction_type,
                    quantity_change=quantity_change,
                    balance_before=old_quantity,
                    balance_after=new_quantity,
                    unit_cost_snapshot=Decimal(material.unit_cost),
                    total_cost=abs(quantity_change) * Decimal(material.unit_cost),
                    note="手動庫存調整",
                ))

        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def delete_material(db: AsyncSession, material_id: int, store_id: int) -> bool:
        """Permanently delete an unreferenced material and its inventory history."""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return False

        usage = await MaterialService.get_usage_summary(db, material_id, store_id)
        if usage and (usage["product_count"] > 0 or usage["composite_count"] > 0):
            raise ValueError("此耗材仍被商品、商品選項或組合耗材使用，請先移除所有關聯")
        await db.delete(material)
        await db.commit()
        return True

    @staticmethod
    async def get_usage_summary(db: AsyncSession, material_id: int, store_id: int) -> Optional[dict]:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return None
        direct_result = await db.execute(
            select(ProductMaterial.product_id).where(ProductMaterial.material_id == material_id)
        )
        direct_product_ids = set(direct_result.scalars().all())
        option_result = await db.execute(
            select(ProductAttribute.product_id)
            .join(ProductAttributeOption, ProductAttributeOption.attribute_id == ProductAttribute.id)
            .join(OptionMaterial, OptionMaterial.option_id == ProductAttributeOption.id)
            .where(OptionMaterial.material_id == material_id)
        )
        option_product_ids = set(option_result.scalars().all())
        composite_result = await db.execute(
            select(MaterialComposition.composite_material_id).where(
                MaterialComposition.component_material_id == material_id
            )
        )
        composite_ids = set(composite_result.scalars().all())
        direct_names_result = await db.execute(
            select(Product.name).where(Product.id.in_(direct_product_ids))
        ) if direct_product_ids else None
        option_names_result = await db.execute(
            select(Product.name).where(Product.id.in_(option_product_ids))
        ) if option_product_ids else None
        composite_names_result = await db.execute(
            select(Material.name).where(Material.id.in_(composite_ids))
        ) if composite_ids else None
        return {
            "product_count": len(direct_product_ids | option_product_ids),
            "direct_product_count": len(direct_product_ids),
            "option_product_count": len(option_product_ids),
            "composite_count": len(composite_ids),
            "direct_products": sorted(direct_names_result.scalars().all()) if direct_names_result else [],
            "option_products": sorted(option_names_result.scalars().all()) if option_names_result else [],
            "composites": sorted(composite_names_result.scalars().all()) if composite_names_result else [],
        }

    @staticmethod
    async def update_stock(
        db: AsyncSession, 
        material_id: int, 
        store_id: int, 
        quantity_change: Decimal,
        transaction_type: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Optional[Material]:
        """更新庫存(增加或減少)"""
        result = await db.execute(
            select(Material)
            .where(Material.id == material_id, Material.store_id == store_id)
            .with_for_update()
        )
        material = result.scalar_one_or_none()
        if not material:
            return None

        material.stock_quantity += quantity_change
        db.add(MaterialInventoryTransaction(
            material_id=material.id,
            transaction_type=transaction_type or ("SALE" if quantity_change < 0 else "ADJUSTMENT_IN"),
            quantity_change=quantity_change,
            balance_before=material.stock_quantity - quantity_change,
            balance_after=material.stock_quantity,
            unit_cost_snapshot=Decimal(material.unit_cost),
            total_cost=abs(quantity_change) * Decimal(material.unit_cost),
            note=note or ("商品配方自動扣庫" if quantity_change < 0 else "庫存增加"),
        ))
        # The caller owns the transaction so order creation and stock deduction
        # either succeed or roll back together.
        await db.flush()
        return material

    @staticmethod
    async def apply_usage(
        db: AsyncSession,
        material_id: int,
        store_id: int,
        quantity_change: Decimal,
        transaction_type: Optional[str] = None,
        note: Optional[str] = None,
        _path: Optional[set[int]] = None,
    ) -> None:
        """Apply usage to a raw material or recursively expand a virtual composite."""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return
        if material.material_type == "raw":
            await MaterialService.update_stock(
                db, material_id, store_id, quantity_change, transaction_type, note
            )
            return
        path = set(_path or set())
        if material_id in path:
            raise ValueError(f"組合耗材 {material.name} 存在循環引用")
        path.add(material_id)
        if material.output_quantity <= 0:
            raise ValueError(f"組合耗材 {material.name} 的產出量無效")
        result = await db.execute(
            select(MaterialComposition).where(MaterialComposition.composite_material_id == material_id)
        )
        for component in result.scalars().all():
            component_change = quantity_change * component.quantity / material.output_quantity
            await MaterialService.apply_usage(
                db,
                component.component_material_id,
                store_id,
                component_change,
                transaction_type,
                note or f"組合耗材「{material.name}」展開扣料",
                path,
            )

    @staticmethod
    async def get_low_stock_materials(db: AsyncSession, store_id: int) -> List[Material]:
        """取得低庫存耗材"""
        result = await db.execute(
            select(Material)
            .where(
                Material.store_id == store_id,
                Material.is_active.is_(True),
                Material.stock_quantity <= Material.low_stock_threshold
            )
            .order_by(Material.stock_quantity)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_inventory_items(db: AsyncSession, material_id: int, store_id: int) -> List[MaterialInventoryItem]:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return []
        result = await db.execute(
            select(MaterialInventoryItem)
            .where(MaterialInventoryItem.material_id == material_id, MaterialInventoryItem.is_active.is_(True))
            .order_by(MaterialInventoryItem.name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_inventory_item(
        db: AsyncSession, material_id: int, store_id: int, item_in: InventoryItemCreate
    ) -> Optional[MaterialInventoryItem]:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return None
        item = MaterialInventoryItem(material_id=material_id, **item_in.model_dump())
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def receive_purchase(
        db: AsyncSession, material_id: int, store_id: int, purchase_in: MaterialPurchaseCreate
    ) -> Optional[MaterialPurchase]:
        # Lock the aggregate row so two simultaneous receipts cannot lose stock/cost updates.
        result = await db.execute(
            select(Material)
            .where(Material.id == material_id, Material.store_id == store_id)
            .with_for_update()
        )
        material = result.scalar_one_or_none()
        if not material:
            return None
        if purchase_in.purchase_quantity <= 0 or purchase_in.conversion_rate <= 0 or purchase_in.unit_price < 0:
            raise ValueError("進貨數量與換算量必須大於 0，價格不可小於 0")

        inventory_item = None
        if purchase_in.inventory_item_id is not None:
            item_result = await db.execute(
                select(MaterialInventoryItem).where(
                    MaterialInventoryItem.id == purchase_in.inventory_item_id,
                    MaterialInventoryItem.material_id == material_id,
                )
            )
            inventory_item = item_result.scalar_one_or_none()
            if not inventory_item:
                raise ValueError("採購規格不屬於此原料")

        base_quantity = purchase_in.purchase_quantity * purchase_in.conversion_rate
        total_cost = purchase_in.purchase_quantity * purchase_in.unit_price
        old_quantity = Decimal(material.stock_quantity)
        old_cost = Decimal(material.unit_cost)
        new_quantity = old_quantity + base_quantity
        average_cost = ((old_quantity * old_cost) + total_cost) / new_quantity

        material.stock_quantity = new_quantity
        material.unit_cost = average_cost
        await MaterialService.refresh_composite_costs(db, material.id)
        purchase = MaterialPurchase(
            material_id=material_id,
            inventory_item_id=inventory_item.id if inventory_item else None,
            purchase_quantity=purchase_in.purchase_quantity,
            purchase_unit=purchase_in.purchase_unit,
            conversion_rate=purchase_in.conversion_rate,
            base_quantity=base_quantity,
            unit_price=purchase_in.unit_price,
            total_cost=total_cost,
            resulting_average_cost=average_cost,
            supplier=purchase_in.supplier,
            note=purchase_in.note,
        )
        db.add(purchase)
        await db.flush()
        db.add(MaterialInventoryTransaction(
            material_id=material_id,
            transaction_type="PURCHASE",
            quantity_change=base_quantity,
            balance_before=old_quantity,
            balance_after=new_quantity,
            unit_cost_snapshot=average_cost,
            total_cost=total_cost,
            purchase_id=purchase.id,
            reference_type="PURCHASE",
            reference_id=purchase.id,
            note=purchase_in.note or (f"供應商：{purchase_in.supplier}" if purchase_in.supplier else None),
        ))
        await db.commit()
        await db.refresh(purchase)
        return purchase

    @staticmethod
    async def get_purchases(db: AsyncSession, material_id: int, store_id: int) -> List[MaterialPurchase]:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return []
        result = await db.execute(
            select(MaterialPurchase)
            .where(MaterialPurchase.material_id == material_id)
            .order_by(MaterialPurchase.purchased_at.desc())
            .limit(100)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_transactions(
        db: AsyncSession, material_id: int, store_id: int, limit: int = 200
    ) -> List[MaterialInventoryTransaction]:
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return []
        result = await db.execute(
            select(MaterialInventoryTransaction)
            .where(MaterialInventoryTransaction.material_id == material_id)
            .order_by(MaterialInventoryTransaction.created_at.desc(), MaterialInventoryTransaction.id.desc())
            .limit(min(max(limit, 1), 500))
        )
        return list(result.scalars().all())
